import paths from './category-icon-paths.json';
import palette from './category-palette.json';

const specialistIds=['auto-expertise','exhaust','turbo','suspension','transmission','car-audio','tuning','facelift'];
export function categoryIconPath(category: string) {
 return Object.prototype.hasOwnProperty.call(paths, category) ? paths[category as keyof typeof paths] : paths.mechanical;
}
export function visualCategory(ids:string[]){return ids.find(id=>specialistIds.includes(id))??ids[0]??'mechanical';}
export const categoryPalette: Record<string,{background:string;ink:string}> = palette;
