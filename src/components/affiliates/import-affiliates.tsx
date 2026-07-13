"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";

// Importador masivo: Excel → vista previa con validación → alta en bloque.
// Los DNI ya existentes se saltean (no se pisa ningún dato).

interface ImportRow {
  fullName: string;
  dni: string;
  legajo?: string | null;
  area?: string | null;
  sector?: string | null;
  position?: string | null;
  employmentType?: string | null;
  phone?: string | null;
  email?: string | null;
  cuil?: string | null;
  birthDate?: string | null;
  hireDate?: string | null;
  affiliationDate?: string | null;
  city?: string | null;
  province?: string | null;
  neighborhood?: string | null;
  streetAddress?: string | null;
  addressNumber?: string | null;
  postalCode?: string | null;
  _rowNumber: number;
  _error: string | null;
}

interface ImportResult {
  created: number;
  skipped: Array<{ dni: string; fullName: string; reason: string }>;
}

const TEMPLATE_HEADERS = [
  "Nombre completo",
  "DNI",
  "Legajo",
  "Área",
  "Sector",
  "Cargo",
  "Situación",
  "Teléfono",
  "Email",
  "CUIL",
  "Fecha de nacimiento",
  "Fecha de ingreso",
  "Fecha de afiliación",
  "Calle",
  "Número",
  "Barrio",
  "Localidad",
  "Provincia",
  "Código postal",
];

function norm(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

const EMPLOYMENT_MAP: Record<string, string> = {
  "planta permanente": "planta_permanente",
  planta_permanente: "planta_permanente",
  permanente: "planta_permanente",
  "planta temporaria": "planta_temporaria",
  planta_temporaria: "planta_temporaria",
  temporaria: "planta_temporaria",
  contratado: "planta_temporaria",
  jubilado: "jubilado",
};

/** Acepta dd/mm/yyyy, dd-mm-yyyy o yyyy-mm-dd. */
function parseDateCell(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const latam = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (latam) return `${latam[3]}-${latam[2].padStart(2, "0")}-${latam[1].padStart(2, "0")}`;
  return null;
}

function cellText(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function ImportAffiliates() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const validRows = rows.filter((r) => !r._error);
  const invalidRows = rows.filter((r) => r._error);

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      [
        "Pérez Juan",
        "30123456",
        "L-1234",
        "Obras",
        "Mantenimiento",
        "Operario",
        "Planta Permanente",
        "3511234567",
        "juan@mail.com",
        "20-30123456-3",
        "15/03/1985",
        "01/02/2010",
        "01/06/2010",
        "San Martín",
        "1520",
        "Centro",
        "Córdoba",
        "Córdoba",
        "5000",
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Afiliados");
    XLSX.writeFile(wb, "plantilla-afiliados.xlsx");
  }

  function handleFile(file: File) {
    setParseError(null);
    setResult(null);
    setRows([]);
    setFileName(file.name);

    void (async () => {
      try {
        const XLSX = await import("xlsx");
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) {
          setParseError("El archivo no tiene hojas.");
          return;
        }
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: "" });
        if (raw.length === 0) {
          setParseError("El archivo no tiene filas de datos.");
          return;
        }
        if (raw.length > 1000) {
          setParseError("Máximo 1000 filas por importación. Dividí el archivo.");
          return;
        }

        const parsed: ImportRow[] = raw.map((r, i) => {
          const get = (...names: string[]): unknown => {
            for (const key of Object.keys(r)) {
              if (names.includes(norm(key))) return r[key];
            }
            return null;
          };

          const fullName = cellText(get("nombre completo", "nombre", "apellido y nombre", "nombre y apellido"));
          const dni = cellText(get("dni", "documento")).replace(/\D/g, "");
          const employmentRaw = norm(cellText(get("situacion", "situacion de revista", "tipo de empleo")));

          let error: string | null = null;
          if (!fullName || fullName.length < 2) error = "Falta el nombre";
          else if (!/^\d{7,15}$/.test(dni)) error = "DNI inválido";

          return {
            fullName,
            dni,
            legajo: cellText(get("legajo")) || null,
            area: cellText(get("area")) || null,
            sector: cellText(get("sector")) || null,
            position: cellText(get("cargo", "puesto")) || null,
            employmentType: EMPLOYMENT_MAP[employmentRaw] ?? null,
            phone: cellText(get("telefono", "celular")) || null,
            email: cellText(get("email", "correo", "mail")) || null,
            cuil: cellText(get("cuil")) || null,
            birthDate: parseDateCell(get("fecha de nacimiento", "nacimiento")),
            hireDate: parseDateCell(get("fecha de ingreso", "ingreso")),
            affiliationDate: parseDateCell(get("fecha de afiliacion", "afiliacion")),
            streetAddress: cellText(get("calle", "direccion")) || null,
            addressNumber: cellText(get("numero", "nro")) || null,
            neighborhood: cellText(get("barrio")) || null,
            city: cellText(get("localidad", "ciudad")) || null,
            province: cellText(get("provincia")) || null,
            postalCode: cellText(get("codigo postal", "cp")) || null,
            _rowNumber: i + 2, // +1 por el encabezado, +1 porque Excel arranca en 1
            _error: error,
          };
        });

        setRows(parsed);
      } catch {
        setParseError("No se pudo leer el archivo. Verificá que sea un Excel válido (.xlsx).");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    })();
  }

  function submit() {
    startTransition(async () => {
      setParseError(null);
      try {
        const payload = {
          rows: validRows.map((r) => {
            const { _rowNumber: _n, _error: _e, ...row } = r;
            void _n;
            void _e;
            return row;
          }),
        };
        const res = await fetch("/api/affiliates/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) {
          setParseError(json.error?.message ?? "Error al importar");
          return;
        }
        setResult(json.data as ImportResult);
        setRows([]);
        setFileName(null);
      } catch {
        setParseError("Error de conexión. Intentá de nuevo.");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Paso 1: archivo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4 text-green-700" />
            1 · Elegí el archivo Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={isPending}>
              <Upload className="h-4 w-4" />
              {fileName ? "Cambiar archivo" : "Seleccionar archivo"}
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4" />
              Descargar plantilla
            </Button>
            {fileName && <span className="text-sm text-[hsl(var(--muted-foreground))]">{fileName}</span>}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            La primera fila debe tener los encabezados (Nombre completo, DNI, Legajo, Área…).
            Solo Nombre y DNI son obligatorios. Los afiliados con DNI ya cargado se saltean:
            la importación nunca pisa datos existentes.
          </p>
          {parseError && (
            <Alert variant="destructive">
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Paso 2: vista previa */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              2 · Vista previa: {validRows.length} fila{validRows.length !== 1 ? "s" : ""} lista
              {validRows.length !== 1 ? "s" : ""} para importar
              {invalidRows.length > 0 && (
                <span className="ml-2 text-sm font-normal text-red-600">
                  ({invalidRows.length} con errores, no se importan)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fila</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Legajo</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 200).map((r) => (
                    <TableRow key={r._rowNumber} className={r._error ? "bg-red-50/60" : ""}>
                      <TableCell className="text-xs text-[hsl(var(--muted-foreground))]">{r._rowNumber}</TableCell>
                      <TableCell className="text-sm">{r.fullName || "—"}</TableCell>
                      <TableCell className="text-sm">{r.dni || "—"}</TableCell>
                      <TableCell className="text-sm">{r.legajo ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.area ?? "—"}</TableCell>
                      <TableCell>
                        {r._error ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-700">
                            <XCircle className="h-3.5 w-3.5" />
                            {r._error}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            OK
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 200 && (
                <p className="border-t px-3 py-2 text-xs text-[hsl(var(--muted-foreground))]">
                  Se muestran las primeras 200 filas; se importan todas las válidas ({validRows.length}).
                </p>
              )}
            </div>

            <Button onClick={submit} disabled={isPending || validRows.length === 0}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar {validRows.length} afiliado{validRows.length !== 1 ? "s" : ""}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Paso 3: resultado */}
      {result && (
        <Card className="border-green-200 bg-green-50/40">
          <CardContent className="space-y-3 p-5">
            <p className="flex items-center gap-2 font-semibold text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Se importaron {result.created} afiliado{result.created !== 1 ? "s" : ""}.
            </p>
            {result.skipped.length > 0 && (
              <div>
                <p className="text-sm font-medium">
                  {result.skipped.length} fila{result.skipped.length !== 1 ? "s" : ""} salteada
                  {result.skipped.length !== 1 ? "s" : ""}:
                </p>
                <ul className="mt-1 max-h-48 space-y-0.5 overflow-auto text-sm text-[hsl(var(--muted-foreground))]">
                  {result.skipped.map((s, i) => (
                    <li key={`${s.dni}-${i}`}>
                      · {s.fullName} (DNI {s.dni}): {s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/afiliados">Ver el padrón</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
