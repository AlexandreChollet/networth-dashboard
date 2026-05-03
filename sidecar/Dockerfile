FROM python:3.12-slim

# Deps système requises par woob (lxml, cryptographie, image processing pour OCR de captchas)
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      libxml2-dev libxslt1-dev \
      libffi-dev libssl-dev \
      libjpeg-dev zlib1g-dev \
      libtiff-dev \
      libgmp-dev libmpfr-dev libmpc-dev \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Crée le datadir persistant + pré-télécharge le module creditmutuel
# pour que le 1er sync ne paie pas la latence du fetch.
ENV WOOB_DIR=/data/woob
RUN mkdir -p /data/woob && \
    python -c "from woob.core import Woob; \
w = Woob(workdir='/data/woob', datadir='/data/woob'); \
w.repositories.update_repositories(); \
w.repositories.install('creditmutuel'); \
print('module creditmutuel pre-installed')"

COPY app.py .

EXPOSE 8000
CMD ["gunicorn", "-b", "0.0.0.0:8000", "-w", "1", "--timeout", "120", "app:app"]
