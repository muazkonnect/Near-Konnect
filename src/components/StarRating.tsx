import { Star } from "lucide-react";

interface Props {
  rating: number;
  size?: number;
}

const StarRating = ({ rating, size = 16 }: Props) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${star <= rating ? "text-star fill-star" : "text-muted-foreground/30"}`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
};

export default StarRating;
