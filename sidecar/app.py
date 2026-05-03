"""Sidecar HTTP — expose les comptes du Crédit Mutuel via woob.

Endpoints :
- GET  /health             → ping
- POST /sync/cm            → tente la sync, retourne JSON normalisé

Le sidecar lit les credentials depuis l'env (CM_LOGIN, CM_PASSWORD,
CM_WEBSITE). Il maintient les sessions woob dans /data/woob (volume monté)
pour ne pas re-déclencher la SCA à chaque appel — on sauvegarde/recharge
explicitement l'état du browser (cookies + twofa_auth_state) entre les
requêtes HTTP, sinon chaque appel repart avec une session vierge.

Codes d'erreur retournés (champ `errorCode`) :
- AUTH_FAILED      : login/mdp refusés
- SCA_REQUIRED     : confirmation à valider sur app CM
- BROWSER_INCORRECT: signature/User-Agent rejetés
- BACKEND_ERROR    : woob a planté
- CONFIG_MISSING   : credentials absents
"""
import json
import logging
import os
import pickle
import traceback
from pathlib import Path
from typing import Any

from flask import Flask, jsonify

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("sidecar")

# Active les logs woob (URLs visitées + debug du CM module). DEBUG=1 dans
# l'env pour activer, ou décommenter ci-dessous pour faire un run d'investigation.
if os.environ.get("WOOB_DEBUG") == "1":
    logging.getLogger("woob").setLevel(logging.DEBUG)
    logging.getLogger("urllib3").setLevel(logging.INFO)

app = Flask(__name__)

STATE_DIR = Path(os.environ.get("WOOB_DIR", "/data/woob")) / "sessions"


def _state_file(provider: str) -> Path:
    return STATE_DIR / f"{provider}.pkl"


def load_browser_state(browser, provider: str) -> bool:
    """Restaure l'état du browser (cookies, twofa_auth_state) depuis disque."""
    f = _state_file(provider)
    if not f.exists():
        return False
    try:
        state = pickle.loads(f.read_bytes())
        browser.load_state(state)
        log.info("session %s restaurée depuis %s", provider, f)
        return True
    except Exception as e:
        log.warning("load_state(%s) a échoué : %s", provider, e)
        return False


def save_browser_state(browser, provider: str) -> None:
    """Persiste l'état du browser après une auth réussie."""
    try:
        state = browser.dump_state()
        f = _state_file(provider)
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(pickle.dumps(state))
        log.info("session %s sauvegardée vers %s", provider, f)
    except Exception as e:
        log.warning("dump_state(%s) a échoué : %s", provider, e)


# Mapping woob AccountType -> AccountType de notre dashboard.
# Valeurs vérifiées contre /usr/local/lib/python3.12/site-packages/woob/capabilities/bank/base.py
ACCOUNT_TYPE_MAP = {
    0: "OTHER",   # UNKNOWN
    1: "CASH",    # CHECKING
    2: "LIVRET",  # SAVINGS
    3: "CASH",    # DEPOSIT
    4: "OTHER",   # LOAN — debt, mais on n'a pas (encore) de mapping LiabilityAccount
    5: "OTHER",   # MARKET (CTO)
    6: "CASH",    # JOINT
    7: "OTHER",   # CARD
    8: "AV",      # LIFE_INSURANCE
    13: "PEA",    # PEA
    15: "PER",    # PERP (ancien)
    16: "PER",    # MADELIN
    17: "OTHER",  # MORTGAGE — debt
    18: "OTHER",  # CONSUMER_CREDIT — debt
    19: "OTHER",  # REVOLVING_CREDIT — debt
    20: "PER",    # PER
    23: "LIVRET", # LDDS
    24: "LIVRET", # PEL
    25: "LIVRET", # CSL
    26: "LIVRET", # CEL
    27: "LIVRET", # CAT
    28: "LIVRET", # LIVRET_A
    29: "LIVRET", # LIVRET_B
}

# Types qu'on traite comme dette plutôt qu'actif
DEBT_TYPES = {4, 17, 18, 19}


def _normalize(account) -> dict[str, Any]:
    """Normalise un compte woob en dict JSON-able."""
    raw_type = int(account.type)
    return {
        "externalKey": str(account.id),
        "label": str(account.label),
        "balance": float(account.balance) if account.balance is not None else 0.0,
        "currency": str(account.currency) if account.currency else "EUR",
        "type": ACCOUNT_TYPE_MAP.get(raw_type, "OTHER"),
        "iban": str(account.iban) if getattr(account, "iban", None) else None,
        "raw_type": raw_type,
        # Indicateur que ce produit est une dette (côté Next, on ne crée pas
        # de Balance dessus tant que le mapping LiabilityAccount n'est pas fait).
        "is_debt": raw_type in DEBT_TYPES or (
            account.balance is not None and float(account.balance) < 0
        ),
    }


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "networth-sidecar"})


@app.route("/sync/cm/reset", methods=["POST"])
def reset_cm():
    """Supprime le state woob CM. À utiliser quand un polling est bloqué
    (validation jamais faite, session expirée, etc.). Le prochain /sync/cm
    redéclenchera une 2FA fresh."""
    f = _state_file("creditmutuel")
    if f.exists():
        try:
            f.unlink()
            return jsonify({"ok": True, "cleared": True})
        except Exception as e:
            return jsonify({"ok": False, "message": str(e)}), 500
    return jsonify({"ok": True, "cleared": False, "message": "no state file"})


@app.route("/sync/cm", methods=["POST"])
def sync_cm():
    login = os.environ.get("CM_LOGIN", "").strip()
    password = os.environ.get("CM_PASSWORD", "").strip()
    website = os.environ.get("CM_WEBSITE", "par").strip()

    if not login or not password:
        return jsonify({
            "ok": False,
            "errorCode": "CONFIG_MISSING",
            "message": "CM_LOGIN ou CM_PASSWORD manquants dans l'env du sidecar.",
        }), 400

    try:
        # Imports locaux : woob est lourd à charger, on le fait à la demande.
        from woob.core import Woob
        from woob.exceptions import (
            BrowserIncorrectPassword,
            BrowserUnavailable,
            AuthMethodNotImplemented,
            BrowserQuestion,
            DecoupledValidation,
            AppValidation,
            BrowserPasswordExpired,
        )
    except Exception as e:
        log.exception("woob import failed")
        return jsonify({
            "ok": False,
            "errorCode": "BACKEND_ERROR",
            "message": f"Import woob impossible : {e}",
        }), 500

    # On capture le browser hors du try pour pouvoir dump_state même quand
    # une exception SCA est levée pendant le login.
    active_browser = None

    try:
        # Woob (et non WoobBase) gère le repository officiel et installe
        # automatiquement les modules manquants. Workdir/datadir persistés
        # dans /data/woob = volume Docker.
        woob_dir = os.environ.get("WOOB_DIR", "/data/woob")
        os.makedirs(woob_dir, exist_ok=True)
        w = Woob(workdir=woob_dir, datadir=woob_dir)

        # 1er run : télécharge la liste des modules. Idempotent ensuite.
        try:
            w.repositories.update_repositories()
        except Exception as e:
            log.warning("update_repositories failed (peut être OK si déjà fait): %s", e)

        # Install si absent (no-op si déjà cache).
        if not w.modules_loader.module_exists("creditmutuel"):
            log.info("Installing module creditmutuel from woob repository…")
            w.repositories.install("creditmutuel")

        # Si on a un state sauvegardé d'une SCA précédente, on déclare
        # `resume="1"` au backend. Le module CM lit ça via
        # AUTHENTICATION_METHODS["resume"] = handle_polling et, au lieu
        # de relancer init_login, va poll CM pour vérifier que la 2FA
        # a été validée côté serveur. Si pas de polling_data en état,
        # handle_polling retombe sur init_login normal — donc safe à set
        # systématiquement quand un state file existe.
        has_state = _state_file("creditmutuel").exists()
        log.info("creditmutuel state file present: %s (resume=%s)", has_state, has_state)

        params: dict[str, str] = {
            "login": login,
            "password": password,
            "website": website,
        }
        if has_state:
            params["resume"] = "1"

        w.load_backend("creditmutuel", "cm", params=params)

        # Force la création du browser puis le marque interactif AVANT toute
        # tentative de login. is_interactive est figé en __init__ depuis
        # config['request_information'] ; on l'écrase pour ne pas avoir à
        # toucher la config woob. Sans ça, le module CM lève
        # NeedInteractiveFor2FA dans check_redirections().
        backend = next(iter(w.iter_backends()))
        active_browser = backend.browser
        active_browser.is_interactive = True
        active_browser.request_information = {}

        # Restaure cookies + twofa_auth_state pour skip la 2FA si déjà
        # validée récemment (CM honore la validation ~30 jours).
        load_browser_state(active_browser, "creditmutuel")

        accounts: list[dict[str, Any]] = []
        for acc in backend.iter_accounts():
            n = _normalize(acc)
            log.info(
                "scraped: %s | type=%s(%s) | bal=%.2f | label=%s",
                n["externalKey"], n["type"], n["raw_type"], n["balance"], n["label"],
            )
            accounts.append(n)

        # Sync OK → persiste l'état complet.
        save_browser_state(active_browser, "creditmutuel")

        return jsonify({
            "ok": True,
            "provider": "creditmutuel",
            "accounts": accounts,
        })

    except (DecoupledValidation, AppValidation, BrowserQuestion) as e:
        log.warning("SCA required: %s", e)
        # CRUCIAL : on dump l'état avant de rendre la main, pour que le
        # prochain appel /sync/cm voie les cookies CM marqués "2FA en
        # attente". Sans ça, la validation sur le tel est perdue dès qu'on
        # rend la réponse HTTP.
        if active_browser is not None:
            save_browser_state(active_browser, "creditmutuel")
        return jsonify({
            "ok": False,
            "errorCode": "SCA_REQUIRED",
            "message": (
                "Validation requise sur l'app Confirmation Mobile. Validez "
                "puis relancez la synchronisation."
            ),
        }), 401

    except BrowserIncorrectPassword as e:
        log.warning("auth failed: %s", e)
        return jsonify({
            "ok": False,
            "errorCode": "AUTH_FAILED",
            "message": f"Identifiants refusés : {e}",
        }), 401

    except BrowserPasswordExpired as e:
        return jsonify({
            "ok": False,
            "errorCode": "AUTH_FAILED",
            "message": f"Mot de passe expiré : {e}",
        }), 401

    except BrowserUnavailable as e:
        return jsonify({
            "ok": False,
            "errorCode": "BROWSER_INCORRECT",
            "message": f"CM indisponible : {e}",
        }), 503

    except AuthMethodNotImplemented as e:
        return jsonify({
            "ok": False,
            "errorCode": "BROWSER_INCORRECT",
            "message": f"Méthode d'auth non supportée : {e}",
        }), 501

    except Exception as e:
        log.exception("unexpected error")
        return jsonify({
            "ok": False,
            "errorCode": "BACKEND_ERROR",
            "message": str(e),
            "trace": traceback.format_exc().splitlines()[-3:],
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
