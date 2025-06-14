import { useState } from 'react';

interface AvatarProps {
  userId: string;
  size?: number;
  onUpload?: (file: File) => Promise<void>;
}

export default function Avatar({ userId, size = 40, onUpload }: AvatarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // 构建头像URL
  const avatarUrl = `/api/avatar/${userId}`;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Avatar: handleFileChange triggered');
    const file = event.target.files?.[0];
    if (file) {
      console.log('Avatar: Selected file:', file.name);
      if (onUpload) {
        try {
          console.log('Avatar: Starting file upload');
          await onUpload(file);
          // 上传成功后重置状态，这样会重新尝试加载新图片
          setImageError(false);
          console.log('Avatar: File upload completed');
        } catch (error) {
          console.error('Avatar: File upload failed:', error);
        }
      } else {
        console.warn('Avatar: onUpload callback is not provided');
      }
    } else {
      console.log('Avatar: No file selected');
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        cursor: onUpload ? 'pointer' : 'default',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        if (onUpload) {
          console.log('Avatar: Clicked to upload');
          // 触发文件选择
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = 'image/*';
          fileInput.onchange = (e) => handleFileChange(e as any);
          fileInput.click();
        }
      }}
    >
      {!imageError ? (
        <img
          src={avatarUrl}
          alt="用户头像"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            console.log('Avatar: Failed to load image:', avatarUrl);
            e.currentTarget.onerror = null; // 防止无限循环
            setImageError(true);
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#e0e0e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.4,
            color: '#666',
          }}
        >
          👤
        </div>
      )}

      {onUpload && isHovered && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: size * 0.3,
          }}
        >
          📷
        </div>
      )}
    </div>
  );
} 