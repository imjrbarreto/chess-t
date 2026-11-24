import type { TrainingCategory } from '../../api/generated/models';

export const trainingCategoryLabels: Record<TrainingCategory, string> = {
    opening: 'Aperturas',
    middlegame: 'Medio juego',
    endgame: 'Finales',
    tactics: 'Táctica',
    strategy: 'Estrategia',
};

export const trainingCategoryVariants = {
    tactics: 'primary',
    strategy: 'success',
    opening: 'info',
    middlegame: 'warning',
    endgame: 'purple',
} as const;