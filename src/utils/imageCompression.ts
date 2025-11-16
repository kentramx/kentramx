/**
 * Compresión de imágenes del lado del cliente
 * Reduce tamaño de archivos antes de subir a Supabase Storage
 */

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1920,
  quality: 0.8,
  format: 'webp',
};

/**
 * Comprime una imagen usando Canvas API
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones
        let { width, height } = img;
        const maxDim = opts.maxWidthOrHeight!;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }

        // Crear canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo crear contexto de canvas'));
          return;
        }

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir imagen'));
              return;
            }

            // Verificar si la compresión redujo el tamaño
            if (blob.size > opts.maxSizeMB! * 1024 * 1024) {
              // Si aún es muy grande, reducir calidad
              const newQuality = Math.max(0.5, opts.quality! * 0.8);
              compressImage(file, { ...opts, quality: newQuality })
                .then(resolve)
                .catch(reject);
              return;
            }

            // Crear nuevo archivo
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, `.${opts.format}`),
              {
                type: `image/${opts.format}`,
                lastModified: Date.now(),
              }
            );

            resolve(compressedFile);
          },
          `image/${opts.format}`,
          opts.quality
        );
      };

      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Valida que el archivo sea una imagen soportada
 */
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato no soportado. Use JPG, PNG o WebP',
    };
  }

  // Límite de 20MB para archivo original
  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'La imagen es demasiado grande (máximo 20MB)',
    };
  }

  return { valid: true };
}

/**
 * Comprime múltiples imágenes en paralelo
 */
export async function compressImages(
  files: File[],
  options?: CompressionOptions,
  onProgress?: (completed: number, total: number) => void
): Promise<File[]> {
  const compressed: File[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const validation = validateImageFile(files[i]);
    if (!validation.valid) {
      throw new Error(`${files[i].name}: ${validation.error}`);
    }

    const compressedFile = await compressImage(files[i], options);
    compressed.push(compressedFile);
    
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return compressed;
}

/**
 * Genera URL de Supabase con transformaciones
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): string {
  if (!url) return url;

  // Si no es una URL de Supabase Storage, retornar sin modificar
  if (!url.includes('/storage/v1/object/public/')) {
    return url;
  }

  const params = new URLSearchParams();
  
  if (options.width) params.append('width', options.width.toString());
  if (options.height) params.append('height', options.height.toString());
  if (options.quality) params.append('quality', options.quality.toString());
  if (options.format) params.append('format', options.format);

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
