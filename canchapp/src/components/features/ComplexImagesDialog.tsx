import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react';
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  Images,
  Loader2,
  Pencil,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '../ui/dialog';
import ComplexImagesService, {
  IMAGE_ACCEPTED_TYPES,
  IMAGE_MAX_CONFIRMED,
  getImageErrorMessage,
  validateImageFile,
} from '../../services/ComplexImagesService';
import type { ComplexImage } from '../../types/complexImage';

interface ComplexImagesDialogProps {
  complex: { complex_id: string; name: string };
  onClose: () => void;
  onChanged: (confirmed: ComplexImage[]) => void;
}

type UploadTaskStatus = 'uploading' | 'confirming' | 'error';

interface UploadTask {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: UploadTaskStatus;
  error?: string;
}

const MAX_DESCRIPTION_LENGTH = 500;
let uploadTaskCounter = 0;

const createTaskId = () => `upload-${Date.now()}-${uploadTaskCounter++}`;

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export function ComplexImagesDialog({
  complex,
  onClose,
  onChanged,
}: ComplexImagesDialogProps) {
  const [images, setImages] = useState<ComplexImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingDescriptionId, setSavingDescriptionId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const previewUrlsRef = useRef<Set<string>>(new Set());
  const uploadChainRef = useRef<Promise<void>>(Promise.resolve());
  const onChangedRef = useRef(onChanged);
  const notifyReadyRef = useRef(false);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    if (!notifyReadyRef.current) return;
    onChangedRef.current(images);
  }, [images]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    };
  }, []);

  const loadImages = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await ComplexImagesService.list(complex.complex_id);
      setImages(data.items.filter((image) => image.status === 'confirmed'));
    } catch (error) {
      setLoadError(getImageErrorMessage(error));
    } finally {
      notifyReadyRef.current = true;
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadImages();
  }, [complex.complex_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const createPreviewUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    previewUrlsRef.current.add(url);
    return url;
  };

  const revokePreviewUrl = (url: string) => {
    if (!previewUrlsRef.current.delete(url)) return;
    URL.revokeObjectURL(url);
  };

  const activeUploadCount = uploadTasks.filter((task) => task.status !== 'error').length;
  const remainingSlots = Math.max(
    0,
    IMAGE_MAX_CONFIRMED - images.length - activeUploadCount,
  );
  const hasActiveUploads = uploadTasks.some(
    (task) => task.status === 'uploading' || task.status === 'confirming',
  );
  const canAddImages = !loading && !loadError && remainingSlots > 0;

  const dropzoneTitle = loadError
    ? 'No se pudo cargar la galería'
    : loading
      ? 'Cargando galería…'
      : isDragging
        ? 'Suelta las imágenes aquí'
        : canAddImages
          ? 'Arrastra tus fotos aquí'
          : 'Límite de imágenes alcanzado';

  const dropzoneHint = loadError
    ? 'Usa "Reintentar" para volver a cargar las imágenes.'
    : loading
      ? 'Espera un momento…'
      : canAddImages
        ? 'o haz clic para seleccionar · JPG, PNG o WebP · máximo 5 MB'
        : 'Elimina una imagen para poder subir otra';

  const uploadOne = async (task: UploadTask) => {
    setUploadTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? { ...item, status: 'uploading', progress: 0, error: undefined }
          : item,
      ),
    );

    try {
      const image = await ComplexImagesService.upload(complex.complex_id, task.file, {
        onProgress: (progress) => {
          setUploadTasks((prev) =>
            prev.map((item) =>
              item.id === task.id
                ? {
                    ...item,
                    progress,
                    status: progress >= 100 ? 'confirming' : 'uploading',
                  }
                : item,
            ),
          );
        },
      });

      setImages((prev) => [image, ...prev]);
      setUploadTasks((prev) => prev.filter((item) => item.id !== task.id));
      revokePreviewUrl(task.previewUrl);
      toast.success(`${task.file.name} se agregó correctamente`);
    } catch (error) {
      setUploadTasks((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? { ...item, status: 'error', error: getImageErrorMessage(error) }
            : item,
        ),
      );
    }
  };

  const enqueueUploads = (tasks: UploadTask[]) => {
    if (tasks.length === 0) return;

    uploadChainRef.current = uploadChainRef.current
      .then(async () => {
        for (const task of tasks) {
          await uploadOne(task);
        }
      })
      .catch(() => undefined);
  };

  const handleFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0 || loading) return;

    if (remainingSlots === 0) {
      toast.error('Ya tienes 3 imágenes confirmadas. Elimina una para subir otra.');
      return;
    }

    if (files.length > remainingSlots) {
      toast.info(
        `Solo puedes agregar ${remainingSlots} imagen${remainingSlots === 1 ? '' : 'es'} más.`,
      );
    }

    const selectedFiles = files.slice(0, remainingSlots);
    const tasks: UploadTask[] = [];

    for (const file of selectedFiles) {
      const validationError = validateImageFile(file);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        continue;
      }

      tasks.push({
        id: createTaskId(),
        file,
        previewUrl: createPreviewUrl(file),
        progress: 0,
        status: 'uploading',
      });
    }

    if (tasks.length === 0) return;

    setUploadTasks((prev) => [...prev, ...tasks]);
    enqueueUploads(tasks);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) handleFiles(event.target.files);
    event.target.value = '';
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!canAddImages) return;
    dragCounterRef.current += 1;
    setIsDragging(true);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (canAddImages) event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (!canAddImages) return;
    handleFiles(event.dataTransfer.files);
  };

  const handleClose = () => {
    if (hasActiveUploads) {
      toast.info('Espera a que terminen las subidas antes de cerrar.');
      return;
    }
    onClose();
  };

  const retryTask = (task: UploadTask) => {
    enqueueUploads([task]);
  };

  const dismissTask = (task: UploadTask) => {
    if (task.status !== 'error') return;
    revokePreviewUrl(task.previewUrl);
    setUploadTasks((prev) => prev.filter((item) => item.id !== task.id));
  };

  const startEditing = (image: ComplexImage) => {
    setEditingId(image.img_id);
    setEditValue(image.description ?? '');
    setConfirmDeleteId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveDescription = async (image: ComplexImage) => {
    const trimmedDescription = editValue.trim();
    const currentDescription = (image.description ?? '').trim();

    if (trimmedDescription === currentDescription) {
      cancelEditing();
      return;
    }

    // The backend ignores empty descriptions (it uses a truthiness check),
    // so clearing an existing description is not supported yet.
    if (trimmedDescription.length === 0) {
      toast.info('Escribe una descripción o pulsa cancelar. El backend aún no permite borrarla.');
      return;
    }

    setSavingDescriptionId(image.img_id);
    try {
      const updated = await ComplexImagesService.confirm(
        complex.complex_id,
        image.img_id,
        trimmedDescription,
      );
      setImages((prev) =>
        prev.map((item) => (item.img_id === image.img_id ? updated : item)),
      );
      setEditingId(null);
      toast.success('Descripción actualizada');
    } catch (error) {
      toast.error(getImageErrorMessage(error));
      const code = (error as { code?: string }).code;
      if (code === 'IMAGE_NOT_FOUND' || code === 'IMAGE_NOT_FOUND_IN_R2') {
        void loadImages();
      }
    } finally {
      setSavingDescriptionId(null);
    }
  };

  const handleDescriptionKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    image: ComplexImage,
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void saveDescription(image);
    }
  };

  const deleteImage = async (image: ComplexImage) => {
    setDeletingId(image.img_id);
    try {
      await ComplexImagesService.remove(complex.complex_id, image.img_id);
      setImages((prev) => prev.filter((item) => item.img_id !== image.img_id));
      setConfirmDeleteId(null);
      if (editingId === image.img_id) cancelEditing();
      toast.success('Imagen eliminada');
    } catch (error) {
      toast.error(getImageErrorMessage(error));
      const code = (error as { code?: string }).code;
      if (code === 'IMAGE_NOT_FOUND') {
        void loadImages();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleImageError = (imageId: string) => {
    setFailedImageIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  };

  return (
    <Dialog isOpen onClose={handleClose} title={`Fotos · ${complex.name}`} size="lg">
      <div className="p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-text-3)]">
              Galería del complejo
            </p>
            <p className="text-sm font-extrabold text-[var(--color-text)]">
              {images.length} de {IMAGE_MAX_CONFIRMED} imágenes confirmadas
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
              remainingSlots > 0
                ? 'bg-[var(--color-primary-tint)] text-[var(--color-primary-dark)]'
                : 'bg-[var(--color-surf2)] text-[var(--color-text-3)]'
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            {loadError
              ? 'No disponible'
              : remainingSlots > 0
                ? `Puedes agregar ${remainingSlots}`
                : 'Límite alcanzado'}
          </span>
        </div>

        <div
          role="button"
          tabIndex={canAddImages ? 0 : -1}
          aria-disabled={!canAddImages}
          onClick={() => {
            if (canAddImages) inputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (!canAddImages) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative overflow-hidden rounded-[var(--radius-2xl)] border-2 border-dashed p-6 text-center outline-none transition-all duration-[var(--duration-mid)] sm:p-7 ${
            !canAddImages
              ? 'cursor-not-allowed border-[var(--color-border)] bg-[var(--color-surf2)] opacity-70'
              : isDragging
                ? 'scale-[1.01] cursor-copy border-[var(--color-primary)] bg-[var(--color-primary-tint)] shadow-[0_0_0_4px_var(--color-primary-glow)]'
                : 'cursor-pointer border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-tint)] focus-visible:border-[var(--color-primary)] focus-visible:shadow-[0_0_0_4px_var(--color-primary-glow)]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPTED_TYPES.join(',')}
            multiple
            className="hidden"
            onChange={handleFileInput}
          />

          <div
            className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 ${
              isDragging
                ? 'scale-110 bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-primary-tint)] text-[var(--color-primary)]'
            }`}
          >
            <UploadCloud className={`h-7 w-7 ${isDragging ? 'animate-pop-in' : ''}`} />
          </div>

          <p className="text-sm font-extrabold text-[var(--color-text)]">{dropzoneTitle}</p>
          <p className="mt-1 text-xs font-semibold text-[var(--color-text-3)]">
            {dropzoneHint}
          </p>
        </div>

        {uploadTasks.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--color-text-3)]">
              Subiendo imágenes
            </p>
            {uploadTasks.map((task) => (
              <div
                key={task.id}
                className="flex gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white p-3 shadow-[var(--shadow-sm)] animate-scale-in"
              >
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surf2)]">
                  <img
                    src={task.previewUrl}
                    alt={task.file.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                    {task.status === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-white" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-extrabold text-[var(--color-text)]">
                      {task.file.name}
                    </p>
                    <span className="flex-shrink-0 text-[10px] font-bold text-[var(--color-text-3)]">
                      {formatFileSize(task.file.size)}
                    </span>
                  </div>

                  <p className="mt-0.5 text-[11px] font-bold text-[var(--color-text-3)]">
                    {task.status === 'error'
                      ? 'No se pudo subir'
                      : task.status === 'confirming'
                        ? 'Confirmando imagen…'
                        : `Subiendo… ${task.progress}%`}
                  </p>

                  {task.status !== 'error' && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surf2)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200"
                        style={{ width: `${Math.max(4, task.progress)}%` }}
                      />
                    </div>
                  )}

                  {task.status === 'error' && task.error && (
                    <p className="mt-1 text-[11px] font-bold text-[var(--color-accent)]">
                      {task.error}
                    </p>
                  )}

                  {task.status === 'error' && (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => retryTask(task)}
                        className="rounded-[var(--radius-full)] bg-[var(--color-primary)] px-3 py-1 text-[10px] font-extrabold text-white transition-all hover:bg-[var(--color-primary-dark)] active:scale-95"
                      >
                        Reintentar
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissTask(task)}
                        className="rounded-[var(--radius-full)] border border-[var(--color-border)] bg-white px-3 py-1 text-[10px] font-extrabold text-[var(--color-text-2)] transition-all hover:bg-[var(--color-surf2)] active:scale-95"
                      >
                        Quitar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="aspect-[4/3] animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surf2)]"
              />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex items-start gap-3 rounded-[var(--radius-xl)] border border-[var(--color-accent)] bg-[var(--color-accent-tint)] p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[var(--color-accent)]" />
            <div className="flex-1">
              <p className="text-sm font-extrabold text-[var(--color-accent)]">
                No se pudieron cargar las imágenes
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-2)]">
                {loadError}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadImages()}
              className="text-xs font-extrabold text-[var(--color-primary)] underline underline-offset-2"
            >
              Reintentar
            </button>
          </div>
        ) : images.length === 0 ? (
          <div className="rounded-[var(--radius-2xl)] border border-dashed border-[var(--color-border)] bg-white/60 p-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-tint)]">
              <ImageIcon className="h-6 w-6 text-[var(--color-primary)]" />
            </div>
            <p className="font-extrabold text-[var(--color-text)]">Aún no hay fotos</p>
            <p className="mt-1 text-xs font-semibold text-[var(--color-text-3)]">
              Sube hasta 3 imágenes para mostrar tu complejo. La primera será la portada.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {images.map((image, index) => {
              const failed = failedImageIds.has(image.img_id);
              const isEditing = editingId === image.img_id;
              const isSaving = savingDescriptionId === image.img_id;
              const isDeleting = deletingId === image.img_id;
              const isConfirmingDelete = confirmDeleteId === image.img_id;

              return (
                <article
                  key={image.img_id}
                  className="group overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)] animate-pop-in"
                  style={{
                    animationDelay: `${Math.min(index, 4) * 55}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surf2)]">
                    {failed ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--color-surf2)] text-[var(--color-text-3)]">
                        <ImageIcon className="h-7 w-7" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider">
                          Vista previa no disponible
                        </span>
                      </div>
                    ) : (
                      <img
                        src={image.image_url}
                        alt={image.description || `Imagen de ${complex.name}`}
                        loading="lazy"
                        onError={() => handleImageError(image.img_id)}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    )}

                    <div className="absolute inset-x-0 top-0 flex justify-end p-2">
                      <span className="rounded-full bg-black/55 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-white backdrop-blur-sm">
                        Confirmada
                      </span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-2 pt-8">
                      {isConfirmingDelete ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="mr-auto text-[10px] font-extrabold text-white">
                            ¿Eliminar?
                          </span>
                          <button
                            type="button"
                            onClick={() => void deleteImage(image)}
                            disabled={isDeleting}
                            className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-extrabold text-white transition-all hover:bg-[var(--color-accent-dark)] active:scale-95 disabled:opacity-60"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Sí'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeleting}
                            className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold text-white backdrop-blur-sm transition-all hover:bg-white/30 active:scale-95"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => startEditing(image)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-white/35 active:scale-90"
                            title="Editar descripción"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteId(image.img_id);
                              setEditingId(null);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all hover:bg-[var(--color-accent)] active:scale-90"
                            title="Eliminar imagen"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3">
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editValue}
                          onChange={(event) => setEditValue(event.target.value)}
                          onKeyDown={(event) => handleDescriptionKeyDown(event, image)}
                          maxLength={MAX_DESCRIPTION_LENGTH}
                          rows={2}
                          autoFocus
                          placeholder="Describe esta imagen…"
                          className="w-full resize-none rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white px-2.5 py-2 text-xs font-semibold text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-glow)]"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-bold text-[var(--color-text-3)]">
                            {editValue.length}/{MAX_DESCRIPTION_LENGTH}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-2)] transition-all hover:bg-[var(--color-surf2)] active:scale-95 disabled:opacity-50"
                              title="Cancelar"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void saveDescription(image)}
                              disabled={isSaving}
                              className="flex h-7 items-center gap-1 rounded-full bg-[var(--color-primary)] px-2.5 text-[10px] font-extrabold text-white transition-all hover:bg-[var(--color-primary-dark)] active:scale-95 disabled:opacity-60"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Guardar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={`line-clamp-2 text-xs leading-snug ${
                          image.description
                            ? 'font-semibold text-[var(--color-text-2)]'
                            : 'font-semibold italic text-[var(--color-text-3)]'
                        }`}
                      >
                        {image.description || 'Sin descripción'}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}

export default ComplexImagesDialog;
