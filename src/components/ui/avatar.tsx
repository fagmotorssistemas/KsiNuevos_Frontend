import React from "react";

interface AvatarProps {
    src?: string;
    initials?: string;
    alt?: string;
    size?: "sm" | "md" | "lg";
}

export const Avatar = ({ src, initials, alt, size = "md" }: AvatarProps) => {
    const sizes = {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
    };

    return (
        <div className={`relative inline-block rounded-full overflow-hidden bg-slate-100 ${sizes[size]}`}>
            {src ? (
                <img src={src} alt={alt} className="h-full w-full object-cover" />
            ) : (
                <span className="flex h-full w-full items-center justify-center font-medium text-slate-600 uppercase">
                    {initials?.slice(0, 2)}
                </span>
            )}
        </div>
    );
};