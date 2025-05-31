// SpinnerOverlay.tsx
export default function SpinnerOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-60 flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent"></div>
    </div>
  );
}
