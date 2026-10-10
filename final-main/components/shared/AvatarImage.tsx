'use client';

import React, { useState } from 'react';

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    fallbackSrc: string;
}

export default function AvatarImage({ src, fallbackSrc, alt, ...props }: AvatarImageProps) {
    const [imgSrc, setImgSrc] = useState<string>(src && src !== null && src !== undefined ? src : fallbackSrc);

    return (
        <img
            {...props}
            src={imgSrc}
            alt={alt || ''}
            onError={() => {
                if (imgSrc !== fallbackSrc) {
                    setImgSrc(fallbackSrc);
                }
            }}
        />
    );
}
