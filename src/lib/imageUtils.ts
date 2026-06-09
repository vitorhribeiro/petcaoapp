/**
 * Conversão automática de imagens para WebP
 * Mantém qualidade visual e reduz tamanho do arquivo
 */
import heic2any from 'heic2any';

export interface ConvertToWebPOptions {
  quality?: number; // 0.0 - 1.0, padrão 0.85
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Converte um File ou Blob para WebP
 * Retorna um Blob WebP pronto para upload
 */
export async function convertImageToWebP(
  file: File | Blob,
  options: ConvertToWebPOptions = {}
): Promise<Blob> {
  const { quality = 0.85, maxWidth, maxHeight } = options;

  return new Promise((resolve, reject) => {
    // Criar URL temporária para a imagem
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        // Calcular dimensões mantendo proporção
        let { width, height } = img;
        
        if (maxWidth && width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (maxHeight && height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Criar canvas para conversão
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Não foi possível criar contexto do canvas');
        }

        // Desenhar imagem no canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Converter para WebP
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error('Falha ao converter imagem para WebP'));
              return;
            }
            resolve(blob);
          },
          'image/webp',
          quality
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem'));
    };

    img.src = url;
  });
}

/**
 * Valida se o arquivo é uma imagem válida
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const fileName = file.name.toLowerCase();
  const isHeicExtension = fileName.endsWith('.heic') || fileName.endsWith('.heif');
  
  if (!validTypes.includes(file.type) && !isHeicExtension) {
    return {
      valid: false,
      error: 'Formato inválido. Use JPG, PNG, WEBP ou HEIC.'
    };
  }

  const maxSize = 8 * 1024 * 1024; // 8MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'A imagem deve ter no máximo 8MB.'
    };
  }

  return { valid: true };
}

/**
 * Converte HEIC/HEIF para JPEG para preview e compatibilidade
 */
export async function processFileIfHEIC(file: File): Promise<File | Blob> {
  const fileName = file.name.toLowerCase();
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || fileName.endsWith('.heic') || fileName.endsWith('.heif');

  if (isHeic) {
    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      });
      const blobToReturn = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      return new File([blobToReturn], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
        type: 'image/jpeg'
      });
    } catch (error) {
      console.error('Erro ao converter HEIC:', error);
      throw new Error('Falha ao converter imagem HEIC do iPhone.');
    }
  }

  return file;
}

/**
 * Cria uma URL de preview temporária para uma imagem
 */
export function createImagePreview(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao criar preview da imagem'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Gera um nome único para o arquivo
 */
export function generateUniqueFileName(prefix: string = 'image'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}.webp`;
}
