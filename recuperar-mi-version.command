#!/bin/bash
# ============================================================
#  RECUPERAR TU VERSIÓN (la avanzada, con sexo/retención/etc.)
#  Restaura el respaldo que el otro script había guardado y
#  levanta el servidor. NO toca producción, NO vuelve a archivar.
# ============================================================

cd "$(dirname "$0")" || exit 1

echo "==============================================="
echo "  Recuperar tu versión de trabajo"
echo "==============================================="
echo ""

# Limpiar locks colgados, por las dudas
rm -f .git/index.lock .git/ORIG_HEAD.lock .git/objects/maintenance.lock 2>/dev/null

# ¿Hay un respaldo guardado?
STASH_REF=$(git stash list 2>/dev/null | grep -m1 "respaldo-auto" | cut -d: -f1)

if [ -n "$STASH_REF" ]; then
  echo "→ Restaurando tu trabajo desde: $STASH_REF"
  if git stash pop "$STASH_REF"; then
    echo "  ✓ Listo: recuperaste tu versión (sexo, retención, situación de revista, etc.)."
  else
    echo "  ⚠ Hubo un conflicto al restaurar. NO se perdió nada:"
    echo "    tu respaldo sigue disponible con 'git stash list'."
    echo "    Avisame y lo resolvemos juntos."
  fi
else
  echo "→ No encontré un respaldo 'respaldo-auto' en el stash."
  echo "  Tu trabajo puede ya estar aplicado. Reviso con: git status"
  git status --short --untracked-files=no | head
fi

echo ""
# Dependencias por las dudas
if [ ! -d "node_modules" ]; then
  echo "→ Instalando dependencias (primera vez)..."
  npm install
fi

( sleep 5 && open "http://localhost:3000" ) &

echo ""
echo "→ Servidor en: http://localhost:3000"
echo "  Para detener: cerrá la ventana o Ctrl + C"
echo ""

npm run dev
