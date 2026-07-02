#!/bin/bash
# ============================================================
#  ARRANCAR LIMPIO
#  Borra la caché temporal de Next.js (.next) y levanta el server.
#  Úsalo cuando aparezcan errores tipo "ENOENT ... build-manifest.json"
#  o "stale". NO toca tu código ni git. La caché se regenera sola.
# ============================================================

cd "$(dirname "$0")" || exit 1

echo "==============================================="
echo "  Arranque limpio"
echo "==============================================="
echo ""

echo "→ Borrando caché temporal (.next)... (se regenera sola)"
rm -rf .next
echo "  ✓ Caché limpia."
echo ""

if [ ! -d "node_modules" ]; then
  echo "→ Instalando dependencias (primera vez)..."
  npm install
fi

( sleep 6 && open "http://localhost:3000" ) &

echo "→ Servidor en: http://localhost:3000"
echo "  Para detener: cerrá la ventana o Ctrl + C"
echo ""

npm run dev
