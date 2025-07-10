import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AnnotoriousOpenseadragonModule } from '../../../annotorious/src/lib/angular/annotorious-openseadragon.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AnnotoriousOpenseadragonModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { } 