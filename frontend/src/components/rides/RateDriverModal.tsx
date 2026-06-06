import React, { useState } from 'react';
import { X, Star } from 'lucide-react';
import { Button } from './../ui/Button';
import api from '../../services/api';

interface RateDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  driverName: string;
  onSuccess?: () => void;
}

export const RateDriverModal: React.FC<RateDriverModalProps> = ({ 
  isOpen, 
  onClose, 
  rideId, 
  driverName,
  onSuccess 
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.post(`/rides/\${rideId}/rate`, {
        rating,
        comment
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit rating. You might have already rated this ride.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Rate your driver</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 mb-2">How was your trip with <span className="font-semibold text-gray-900">{driverName}</span>?</p>
            
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star 
                    size={36} 
                    fill={(hoverRating || rating) >= star ? "#F59E0B" : "transparent"} 
                    className={(hoverRating || rating) >= star ? "text-amber-500" : "text-gray-300"} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leave a comment (Optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none transition-all text-sm"
              rows={3}
              placeholder="What did you like about the ride?"
            />
          </div>

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 shadow-lg shadow-primary/20"
              isLoading={isSubmitting}
            >
              Submit Rating
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
