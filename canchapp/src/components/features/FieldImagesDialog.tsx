import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  AlertCircle,
  Image as ImageIcon,
  Images,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '../ui/dialog';
import FieldImagesService, {
  FIELD_IMAGE_MAX_CONFIRMED,
  getFieldImageErrorMessage,
} from '../../services/FieldImagesService';
import { IMAGE_ACCEPTED_TYPES, validateImageFile } from '../../services/ComplexImagesService';
import type { ComplexImage } from '../../types/complexImage';

interface FieldImagesDialogProps {
  field: { field_id: string; name: string; complexName?: string };
  onClose: () => void;
  onChanged: (confirmed: ComplexImage[]) => void;
}

export function FieldImagesDialog({ field, onClose, onChanged }: FieldImagesDialogProps) {
  const [images, setImages] = useState<ComplexImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const onChangedRef = useRef(onChanged);
  const notifyReadyRef = useRef(false);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    if (!notifyReadyRef.current) return;
    onChangedRef.current(images);
  }, [images]);

  const loadImages = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await FieldImagesService.list(field.field_id);
      setImages(data.items.filter((image) => image.status === 'confirmed'));
    } catch (error) {
      setLoadError(getFieldImageErrorMessage(error));
    } finally {
      notifyReadyRef.current = true;
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadImages();
  }, [field.field_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const remainingSlots = Math.max(0, FIELD_IMAGE_MAX_CONFIRMED - images.length);
  const canAdd = !loading && !uploading && remainingSlots > 0;

  const uploadFiles = async (files: File[]) => {
    if (!canAdd || files.length === 0) return;

    const selected = files.slice(0, remainingSlots);
    setUploading(true);
    setProgress(0);

    for (const file of selected) {
      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(validationError);
        continue;
      }

      try {
        const image = await FieldImagesService.upload(field.field_id, file, {
          onProgress: setProgress,
        });
        setImages((prev) => [image, ...prev]);
        toast.success(`${file.name} se agregó correctamente`);
      } catch (error) {
        toast.error(getFieldImageErrorMessage(error));
      }
    }

    setUploading(false);
    setProgress(0);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    void uploadFiles(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    void uploadFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const handleDelete = async (image: ComplexImage) => {
    setDeletingId(image.img_id);
    try {
      await FieldImagesService.remove(field.field_id, image.img_id);
      setImages((prev) => prev.filter((item) => item.img_id !== image.img_id));
      setConfirmDeleteId(null);
      toast.success('Imagen eliminada');
    } catch (error) {
      toast.error(getFieldImageErrorMessage(error));
    } finally {
      setDeletingId(null);
    }
  };

  const markFailed = (imageId: string) => {
    setFailedIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

  const handleClose = () => {
    if (uploading) {
      toast.info('Espera a que termine la subida antes de cerrar.');
      return;
    }
    onClose();
  };

  return (
    <Dialog isOpen onClose={handleClose} title={`Fotos de ${field.name}`} size="md">
      <div className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-extrabold text-[var(--color-text)]">
              <Images className="h-4 w-4 text-[var(--color-primary)]" />
              Fotos de la cancha
            </p>
            {field.complexName && (
              <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-3)]">
                {field.complexName}
              </p>
            )}
          </div>
          <span className="rounded-full bg-[var(--color-primary-tint)] px-3 py-1 text-[11px] font-extrabold text-[var(--color-primary-dark)]">
            {images.length} de {FIELD_IMAGE_MAX_CONFIRMED}
          </span>
        </div>

        {loadError && (
          <div className="flex items-start gap-2 rounded-[var(--radius-lg)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-[var(--color-text-3)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--color-primary)]" />
            Cargando fotos...
          </div>
        ) : (
          <>
            {remainingSlots > 0 && (
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  dragCounterRef.current += 1;
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  dragCounterRef.current -= 1;
                  if (dragCounterRef.current <= 0) {
                    dragCounterRef.current = 0;
                    setIsDragging(false);
                  }
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                onClick={() => canAdd && inputRef.current?.click()}
                className={`cursor-pointer rounded-[var(--radius-xl)] border-2 border-dashed p-6 text-center transition-all ${
                  isDragging
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-tint)]'
                    : 'border-[var(--color-border)] bg-white/60 hover:border-[var(--color-primary)]'
                } ${!canAdd ? 'pointer-events-none opacity-50' : ''}`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={IMAGE_ACCEPTED_TYPES.join(',')}
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
                <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary-tint)]">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" />
                  ) : (
                    <UploadCloud className="h-5 w-5 text-[var(--color-primary)]" />
                  )}
                </div>
                <p className="text-sm font-extrabold text-[var(--color-text)]">
                  {uploading ? `Subiendo... ${progress}%` : 'Subir foto de la cancha'}
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--color-text-3)]">
                  JPG, PNG o WebP · máximo 5 MB
                </p>
              </div>
            )}

            {images.length === 0 ? (
              <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] bg-white/60 p-8 text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-[var(--color-text-3)]" />
                <p className="mt-2 text-sm font-extrabold text-[var(--color-text)]">
                  Esta cancha aún no tiene fotos
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--color-text-3)]">
                  Puedes agregar hasta {FIELD_IMAGE_MAX_CONFIRMED} imágenes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {images.map((image) => {
                  const failed = failedIds.has(image.img_id);
                  const isConfirmingDelete = confirmDeleteId === image.img_id;

                  return (
                    <div
                      key={image.img_id}
                      className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)]"
                    >
                      <div className="relative aspect-[4/3] bg-[var(--color-surf2)]">
                        {failed ? (
                          <div className="flex h-full items-center justify-center text-[var(--color-text-3)]">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        ) : (
                          <img
                            src={image.image_url}
                            alt={`Foto de ${field.name}`}
                            loading="lazy"
                            onError={() => markFailed(image.img_id)}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 p-2.5">
                        {isConfirmingDelete ? (
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="text-xs font-bold text-red-700">¿Eliminar?</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-full bg-[var(--color-surf2)] px-2.5 py-1 text-[11px] font-extrabold text-[var(--color-text-2)]"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(image)}
                                disabled={deletingId === image.img_id}
                                className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-extrabold text-white disabled:opacity-60"
                              >
                                {deletingId === image.img_id && (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                )}
                                Sí
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="truncate text-[11px] font-semibold text-[var(--color-text-3)]">
                              {image.description || 'Foto confirmada'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(image.img_id)}
                              className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1 text-[11px] font-extrabold text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                              Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="flex justify-end border-t border-[var(--color-border)] pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surf2)] px-5 py-2.5 text-sm font-extrabold text-[var(--color-text-2)] transition-colors hover:bg-[var(--color-border)]"
          >
            <X className="h-4 w-4" />
            Cerrar
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export default FieldImagesDialog;
