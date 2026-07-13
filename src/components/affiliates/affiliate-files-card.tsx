"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, ImageIcon, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { AFFILIATE_FILE_KIND_LABELS, formatAffiliateFileKind } from "@/lib/utils/labels";
import type { AffiliateFile, AffiliateFileKind } from "@/types";

// Tarjeta "Fotos y documentos" de la ficha: subir, ver y borrar archivos.
// La foto de perfil (kind 'foto') reemplaza a la anterior automáticamente.
// El listado viene sin la columna binaria (el archivo se sirve por su URL).

type AffiliateFileInfo = Omit<AffiliateFile, "data">;

export function AffiliateFilesCard({
  affiliateId,
  files,
}: {
  affiliateId: string;
  files: AffiliateFileInfo[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<AffiliateFileKind>("foto");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function upload(file: File) {
    startTransition(async () => {
      setError(null);
      try {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("kind", kind);
        const res = await fetch(`/api/affiliates/${affiliateId}/files`, {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message ?? "No se pudo subir el archivo");
          return;
        }
        router.refresh();
      } catch {
        setError("Error de conexión. Intentá de nuevo.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  function remove(fileId: string) {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/affiliates/${affiliateId}/files/${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message ?? "No se pudo eliminar el archivo");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4" />
          Fotos y documentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={kind} onValueChange={(v) => setKind(v as AffiliateFileKind)}>
            <SelectTrigger className="h-9 w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(AFFILIATE_FILE_KIND_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Subir archivo
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            JPG, PNG, WebP o PDF · máx. 4 MB
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {files.length === 0 ? (
          <p className="py-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Sin archivos cargados. Subí la foto del afiliado, el DNI escaneado o la ficha firmada.
          </p>
        ) : (
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                {f.contentType?.startsWith("image/") ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-blue-600" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-slate-600" />
                )}
                <div className="min-w-0 flex-1">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-medium transition-colors hover:text-[hsl(var(--primary))]"
                  >
                    {f.fileName}
                  </a>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    {formatAffiliateFileKind(f.kind)}
                    {f.sizeBytes ? ` · ${formatSize(f.sizeBytes)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  disabled={isPending}
                  title="Eliminar archivo"
                  className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
