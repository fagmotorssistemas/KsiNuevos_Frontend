import Image from "next/image";
import { SUCCESS_STORY_IMAGES } from "./successStories";

export const BuyerSection = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
      {SUCCESS_STORY_IMAGES.map((story, index) => (
        <div
          key={story.src}
          className="story-frame group relative aspect-[4/5] overflow-hidden border border-neutral-200 bg-neutral-200"
          style={{ animationDelay: `${index * 90}ms` }}
        >
          <Image
            src={story.src}
            alt={story.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={index === 0}
            className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
            quality={90}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-40" />
        </div>
      ))}
    </div>
  );
};

export default BuyerSection;
