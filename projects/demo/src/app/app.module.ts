import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AnnotoriousOpenseadragonModule } from '../../../annotorious/src/public-api';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AnnotoriousOpenseadragonModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }