import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forRoot([], { preloadingStrategy: PreloadAllModules, useHash: false, initialNavigation: 'enabledNonBlocking' })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
