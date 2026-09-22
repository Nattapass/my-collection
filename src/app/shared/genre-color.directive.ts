import { Directive, input } from '@angular/core';

@Directive({
  selector: '[appGenreColor]',
  host: {
    '[style.background-color]': "'hsl(' + hue() + ' 72% 84%)'",
    '[style.color]': "'hsl(' + hue() + ' 65% 24%)'",
    '[style.border-color]': "'hsl(' + hue() + ' 55% 62%)'",
    '[style.font-weight]': "'700'"
  }
})
export class GenreColorDirective {
  readonly appGenreColor = input(0);
  hue() { return (210 + this.appGenreColor() * 137.508) % 360; }
}
