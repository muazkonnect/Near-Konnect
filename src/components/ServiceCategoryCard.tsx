import { motion } from "framer-motion";
import type { ServiceCategory } from "@/data/mockData";

interface Props {
  category: ServiceCategory;
  onClick: (id: string) => void;
}

const ServiceCategoryCard = ({ category, onClick }: Props) => {
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(category.id)}
      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border hover:border-primary/30 hover:shadow-premium transition-all duration-300 cursor-pointer group"
    >
      <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{category.icon}</span>
      <span className="text-sm font-semibold text-card-foreground">{category.name}</span>
      <span className="text-xs text-muted-foreground">{category.count} available</span>
    </motion.button>
  );
};

export default ServiceCategoryCard;