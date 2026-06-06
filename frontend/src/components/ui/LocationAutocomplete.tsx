import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import api from '../../services/api';

interface LocationAutocompleteProps {
  label?: string;
  placeholder?: string;
  onLocationSelect: (location: { placeName: string; lng: number; lat: number }) => void;
  className?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  label,
  placeholder = 'Search location...',
  onLocationSelect,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ placeName: string; lng: number; lat: number }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Use our authenticated api instance — hits /api/location/autocomplete
        const response = await api.get('/location/autocomplete', {
          params: { q: query },
        });
        // Backend returns { results: [{ placeName, lng, lat }] }
        const data: { placeName: string; lng: number; lat: number }[] =
          response.data.results || [];
        setResults(data);
        setIsOpen(data.length > 0);
      } catch (error) {
        console.error('Error fetching locations', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSelect = (item: { placeName: string; lng: number; lat: number }) => {
    setQuery(item.placeName);
    setIsOpen(false);
    onLocationSelect(item);
  };

  return (
    <div ref={wrapperRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}

      <div className="relative flex items-center w-full">
        <div className="absolute left-3 text-gray-400 z-10 pointer-events-none">
          <MapPin size={18} />
        </div>

        <input
          className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-800 placeholder:text-gray-400 transition-all"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />

        {isLoading && (
          <div className="absolute right-3">
            <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-[9999] max-h-60 overflow-y-auto">
          {results.map((item, idx) => (
            <div
              key={idx}
              className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-start gap-3 transition-colors"
              onMouseDown={(e) => {
                // Use mousedown so it fires before input blur
                e.preventDefault();
                handleSelect(item);
              }}
            >
              <MapPin size={15} className="text-indigo-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-gray-700 leading-snug">{item.placeName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
