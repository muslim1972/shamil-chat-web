import { create } from 'zustand';

interface SearchState {
  searchHistory: string[];
  addToSearchHistory: (term: string) => void;
  clearSearchHistory: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchHistory: [],
  addToSearchHistory: (term) =>
    set((state) => ({
      searchHistory: [term, ...state.searchHistory.filter((t) => t !== term)].slice(0, 5),
    })),
  clearSearchHistory: () => set({ searchHistory: [] }),
}));
