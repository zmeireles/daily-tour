import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { PlaceMedia } from "./use-place-detail";

interface GalleryProps {
  media: PlaceMedia[];
  altFallback: string;
}

export function Gallery({ media, altFallback }: GalleryProps) {
  const images = [...media]
    .filter((m) => m.kind === "image")
    .sort((a, b) => a.sort_order - b.sort_order);

  if (images.length <= 1) return null;

  return (
    <div>
      <Carousel opts={{ align: "start", loop: false }}>
        <CarouselContent>
          {images.map((img) => (
            <CarouselItem key={img.id} className="basis-4/5">
              <div className="aspect-video overflow-hidden rounded-2xl bg-muted">
                <img
                  src={img.url}
                  alt={img.alt?.en ?? altFallback}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-2" />
        <CarouselNext className="-right-2" />
      </Carousel>
    </div>
  );
}
