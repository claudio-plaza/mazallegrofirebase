
import * as XLSX from 'xlsx';

export interface InvitadoExcel {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: Date | null;
  error?: string;
}

const REQUIRED_COLUMNS = ['nombre', 'apellido', 'dni', 'fecha de nacimiento'];

export const parseGuestExcel = async (file: File): Promise<{ data: InvitadoExcel[], errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header array to validate columns first
        const jsonSheet = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (jsonSheet.length === 0) {
           resolve({ data: [], errors: ['El archivo está vacío.'] });
           return;
        }

        const headers = (jsonSheet[0] as string[]).map(h => h.toLowerCase().trim());
        
        // Strict Validation: Check for missing columns
        const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
          resolve({ 
            data: [], 
            errors: [`Faltan columnas obligatorias: ${missingColumns.join(', ')}. Por favor use la plantilla correcta.`] 
          });
          return;
        }

        // Strict Validation: Check for extra columns (optional, as per user request to avoid "messing up")
        // User said: "que no agreguen columnas nuevas. campos nuevos ni nada que pueda estropear la carga"
        // We can just warn or error. For "strict", warning might be enough or error. Let's start with strict error.
        const extraColumns = headers.filter(h => !REQUIRED_COLUMNS.includes(h));
        if (extraColumns.length > 0) {
             resolve({ 
            data: [], 
            errors: [`El archivo contiene columnas no permitidas: ${extraColumns.join(', ')}. Por favor elimínelas para evitar errores.`] 
          });
          return;
        }

        // Parse actual data
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: headers, defval: "" });
        // Remove header row if it was included (sheet_to_json with explicit header usually treats first row as data if range not set, 
        // but here we used headers array derived from first row. Wait, if we pass 'header: headers', it maps keys.
        // Actually best way is to let sheet_to_json auto-discover headers and valid row by row.
        
        const finalData: InvitadoExcel[] = [];
        const errors: string[] = [];

        // Skip first row (headers) - jsonData usually includes it if we don't handle range.
        // Let's use standard sheet_to_json without config to get clean objects keyed by header
        const rawData = XLSX.utils.sheet_to_json(sheet) as any[];

        rawData.forEach((row, index) => {
           // Normalize keys to lowercase for checking
           const normalizedRow: any = {};
           Object.keys(row).forEach(key => {
               normalizedRow[key.toLowerCase().trim()] = row[key];
           });

           const nombre = normalizedRow['nombre'] || '';
           const apellido = normalizedRow['apellido'] || '';
           const dni = normalizedRow['dni'] || '';
           let fechaNac = normalizedRow['fecha de nacimiento'];

           if (!nombre || !apellido || !dni || !fechaNac) {
               errors.push(`Fila ${index + 2}: Faltan datos obligatorios.`);
               return;
           }

           // Parse Date
           let finalDate: Date | null = null;
           // Excel serial date handling or string parsing
           if (typeof fechaNac === 'number') {
               // Excel date serial
               finalDate = new Date(Math.round((fechaNac - 25569) * 86400 * 1000));
           } else {
               // Try parsing string DD/MM/YYYY or YYYY-MM-DD
               const parts = fechaNac.split(/[-/]/);
               if (parts.length === 3) {
                   // Assume DD/MM/YYYY if first part is small, or YYYY-MM-DD if first part is large
                   if (parts[0].length === 4) {
                       finalDate = new Date(fechaNac);
                   } else {
                       finalDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                   }
               } else {
                   finalDate = new Date(fechaNac);
               }
           }

           if (!finalDate || isNaN(finalDate.getTime())) {
                errors.push(`Fila ${index + 2}: Fecha de nacimiento inválida (${fechaNac}).`);
                return;
           }

           finalData.push({
               nombre: String(nombre).trim(),
               apellido: String(apellido).trim(),
               dni: String(dni).trim(),
               fechaNacimiento: finalDate
           });
        });

        resolve({ data: finalData, errors });

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};
