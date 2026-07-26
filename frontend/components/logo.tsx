import Image from 'next/image'
import { cn } from '@/lib/utils'

export const Logo = ({ className, uniColor }: { className?: string; uniColor?: boolean }) => {
    return (
        <Image
            src="/logo.jpeg"
            alt="MyWorkSpace Logo"
            width={64}
            height={64}
            className={cn("h-6 w-6 rounded-full object-cover shadow-sm", className)}
        />
    )
}

export const LogoIcon = Logo;
