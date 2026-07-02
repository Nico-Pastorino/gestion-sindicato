#!/bin/bash
# ============================================================
#  Sistema Sindical — arranque local
#  1) Actualiza la carpeta a la versión que está en producción
#  2) Levanta el servidor en http://localhost:3000
#  Doble clic para usar. Para detener: cerrá la ventana o Ctrl + C
# ============================================================

cd "$(dirname "$0")" || exit 1

echo "==============================================="
echo "  Sistema Sindical — arranque local"
echo "==============================================="
echo ""

# ── 1. Actualizar a producción (rama main) ──
if [ -d ".git" ]; then
  # Limpiar locks de git que pudieran haber quedado colgados
  rm -f .git/index.lock .git/ORIG_HEAD.lock .git/objects/maintenance.lock 2>/dev/null

  echo "→ Buscando la última versión en GitHub..."
  git fetch origin main

  # Si hay cambios sin guardar (en archivos versionados), los respaldamos
  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    STASH_NAME="respaldo-auto-$(date +%Y%m%d-%H%M%S)"
    echo "→ Guardando tus cambios locales en un respaldo ('$STASH_NAME')..."
    git stash push -m "$STASH_NAME"
    echo "  (para recuperarlos luego: git stash list / git stash pop)"
  fi

  echo "→ Actualizando a la versión de producción..."
  if git merge --ff-only origin/main; then
    echo "  ✓ Carpeta actualizada a producción."
  else
    echo "  ⚠ No se pudo actualizar automáticamente; se arranca con lo que haya."
  fi
else
  echo "⚠ Esta carpeta no es un repositorio git; se arranca tal cual está."
fi
echo ""

# ── 2. Dependencias ──
if [ ! -d "node_modules" ]; then
  echo "→ Instalando dependencias (solo la primera vez, puede tardar)..."
  npm install
fi

# ── 3. Abrir el navegador cuando el server esté arriba ──
( sleep 5 && open "http://localhost:3000" ) &

echo ""
echo "→ Servidor en: http://localhost:3000"
echo "  Para detenerlo: cerrá esta ventana o apretá Ctrl + C"
echo ""

npm run dev
