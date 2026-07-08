import fs from 'fs';
import path from 'path';

const OUTPUT_FILE = 'proyecto_para_ia.txt';
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', '.vite']);
const IGNORED_FILES = new Set(['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store', OUTPUT_FILE, 'unificar.js']);
const ALLOWED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.css', '.json', '.html', '.md', '.env']);

let fileList = [];

function getAllFiles(dirPath) {
    try {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const fullPath = path.join(dirPath, file);
            const relativePath = path.relative(process.cwd(), fullPath);
            let stat;
            
            try {
                stat = fs.statSync(fullPath);
            } catch (e) {
                return; 
            }

            if (stat.isDirectory()) {
                if (!IGNORED_DIRS.has(file)) {
                    getAllFiles(fullPath);
                }
            } else {
                if (!IGNORED_FILES.has(file)) {
                    const ext = path.extname(file);
                    if (ALLOWED_EXTENSIONS.has(ext) || file.startsWith('.env')) {
                        fileList.push(relativePath);
                    }
                }
            }
        });
    } catch (err) {
        console.error(`Error leyendo el directorio ${dirPath}:`, err.message);
    }
}

try {
    console.log('=== Iniciando unificación de proyecto para IA ===');
    getAllFiles(process.cwd());

    let outputContent = '';

    outputContent += `=======================================================================\n`;
    outputContent += `CONTEXTO DEL PROYECTO (GENERADO AUTOMÁTICAMENTE)\n`;
    outputContent += `Este archivo contiene el código fuente estructurado para análisis de IA.\n`;
    outputContent += `=======================================================================\n\n`;

    outputContent += `=======================================================================\n`;
    outputContent += `ESTRUCTURA DE ARCHIVOS INCLUIDOS:\n`;
    outputContent += `=======================================================================\n`;
    fileList.forEach(f => {
        outputContent += `  - ${f}\n`;
    });
    outputContent += `\n`;

    fileList.forEach(f => {
        outputContent += `=======================================================================\n`;
        outputContent += `ARCHIVO: ${f}\n`;
        outputContent += `=======================================================================\n`;
        try {
            const content = fs.readFileSync(f, 'utf8');
            outputContent += content;
        } catch (err) {
            outputContent += `[Error al leer el archivo: ${err.message}]`;
        }
        outputContent += `\n\n`;
    });

    fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf8');
    console.log(`\n¡Éxito! Se ha creado el archivo "${OUTPUT_FILE}" con toda tu estructura y código limpios.`);

} catch (error) {
    console.error('Ocurrió un error general:', error.message);
}