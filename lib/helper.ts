export const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

export const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
};