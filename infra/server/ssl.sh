#!/usr/bin/env bash
# Certificados HTTPS (Let's Encrypt) e instalación de la configuración Nginx definitiva.
#
#   sudo bash infra/server/ssl.sh
#   sudo LETSENCRYPT_EMAIL=correo@ejemplo.com bash infra/server/ssl.sh   # avisos de caducidad
#
# Solo incluye los dominios cuyos DNS ya apuntan a este servidor; el canónico es obligatorio.
# Si algún dominio aún no apunta, vuelve a ejecutarlo más tarde: amplía el mismo certificado (--expand).
# La renovación es automática (temporizador de certbot) y recarga Nginx al renovar.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Ejecuta con sudo: sudo bash $0" >&2
  exit 1
fi

# shellcheck source=config.sh
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"
CERT_NAME="javis-market"

ready=() pending=()
while read -r d; do
  if dig +short A "$d" @1.1.1.1 | grep -qx "$SERVER_IP"; then ready+=("$d"); else pending+=("$d"); fi
done < <(all_domains)

echo "Apuntan a $SERVER_IP: ${ready[*]:-ninguno}"
((${#pending[@]})) && echo "Pendientes de DNS (se omiten): ${pending[*]}"

if [[ " ${ready[*]} " != *" $CANONICAL_DOMAIN "* ]]; then
  echo "El dominio canónico $CANONICAL_DOMAIN aún no apunta a $SERVER_IP. Cambia su registro A y reintenta." >&2
  exit 1
fi

domain_args=()
for d in "${ready[@]}"; do domain_args+=(-d "$d"); done
email_args=(--register-unsafely-without-email)
[[ -n "${LETSENCRYPT_EMAIL:-}" ]] && email_args=(-m "$LETSENCRYPT_EMAIL")

certbot certonly --webroot -w /var/www/certbot --cert-name "$CERT_NAME" --expand \
  --non-interactive --agree-tos "${email_args[@]}" "${domain_args[@]}"

# Recargar Nginx en cada renovación.
install -d /etc/letsencrypt/renewal-hooks/deploy
cat >/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'EOF'
#!/bin/sh
systemctl reload nginx
EOF
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

# Configuración definitiva: canónico con HTTPS; el resto (www y otros dominios) redirige a él.
redirects=$(printf '%s\n' "${ready[@]}" | grep -vx "$CANONICAL_DOMAIN" | tr '\n' ' ')
sed -e "s|<DOMAIN>|$CANONICAL_DOMAIN|g" \
  -e "s|<ALL_DOMAINS>|$(all_domains | tr '\n' ' ')|g" \
  -e "s|<REDIRECT_DOMAINS>|${redirects:-www.$CANONICAL_DOMAIN}|g" \
  -e "s|<APP_PORT>|$APP_PORT|g" \
  -e "s|<STORAGE_PUBLIC_DIR>|$STORAGE_PUBLIC_DIR|g" \
  -e "s|<CERT_PATH>|/etc/letsencrypt/live/$CERT_NAME/fullchain.pem|g" \
  -e "s|<KEY_PATH>|/etc/letsencrypt/live/$CERT_NAME/privkey.pem|g" \
  "$REPO_DIR/infra/nginx/javis-market.conf.template" >/etc/nginx/sites-available/javis-market
ln -sf /etc/nginx/sites-available/javis-market /etc/nginx/sites-enabled/javis-market
nginx -t
systemctl reload nginx

echo
echo "HTTPS activo: https://$CANONICAL_DOMAIN"
((${#pending[@]})) && echo "Cuando propaguen los DNS pendientes, vuelve a ejecutar: sudo bash $0"
exit 0
