interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className="mb-7 flex flex-col items-center text-center">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-green-500/40 bg-gray-950 shadow-lg shadow-green-500/20">
          <img src="/cuypequeniologo.png" alt="CanchApp" className="h-9 w-9 object-contain" />
        </div>
        <span className="text-2xl tracking-tight">
          <span className="font-extrabold text-gray-900">Canch</span>
          <span className="font-extrabold text-green-600">App</span>
        </span>
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{title}</h1>
      <p className="mt-1.5 max-w-sm text-sm font-medium leading-relaxed text-gray-500">{subtitle}</p>
    </div>
  );
}

export default AuthHeader;
