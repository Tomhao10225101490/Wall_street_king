interface BossToastProps {
  message: string;
  onDismiss: () => void;
}

export function BossToast({ message, onDismiss }: BossToastProps) {
  return (
    <div className="boss-toast" role="alert">
      <div className="avatar boss sm">VK</div>
      <p>{message}</p>
      <button type="button" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
