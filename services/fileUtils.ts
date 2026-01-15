import { LogEntry } from '../types';
import Tesseract from 'tesseract.js';

declare global {
  interface Window {
    XLSX: any;
    mammoth: any;
  }
}

export const getFileType = (file: File): 'excel' | 'word' | 'image' | 'pdf' | 'unknown' => {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type.includes('sheet') || type.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    return 'excel';
  }
  if (type.includes('word') || type.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) {
    return 'word';
  }
  if (type.includes('image') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return 'image';
  }
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    return 'pdf';
  }
  return 'unknown';
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const readExcelContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = window.XLSX.utils.sheet_to_json(worksheet, { raw: false });
        resolve(JSON.stringify(json, null, 2));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const readWordContent = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (window.mammoth) {
        window.mammoth.extractRawText({ arrayBuffer: arrayBuffer })
          .then((result: any) => {
            resolve(result.value);
          })
          .catch((err: any) => reject(err));
      } else {
        reject(new Error("未加载 Mammoth 库，无法解析 Word"));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const recognizeText = async (file: File, language: string = 'chi_sim+eng'): Promise<string> => {
  if (file.type.includes('pdf')) {
    return "[PDF OCR Not Supported in Client-Side Mode yet. Please use Image.]";
  }

  try {
    const result = await Tesseract.recognize(
      file,
      language,
      {
        logger: m => console.log(m),
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
      } as any // Cast to any to allow custom parameters
    );
    return result.data.text;
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("OCR 识别失败");
  }
};

export const createExcelDownload = (data: any[], filename: string) => {
  const ws = window.XLSX.utils.json_to_sheet(data);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "询价单");
  window.XLSX.writeFile(wb, filename);
};