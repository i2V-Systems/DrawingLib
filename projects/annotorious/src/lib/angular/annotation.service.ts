import { Injectable } from '@angular/core';
import { Annotation, AnnotationBody, Geometry, TextGeometry } from '../types';


export interface LabelModel {
  labelName: string;
  point: PointModel;
  strokeColor: string;
  textSize: number;
}

export interface PointModel {
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnnotationService {

  constructor() { }


/**
 * Creates a Polygon Annotation Object with LabelModel support
 */
polygon(
  id: string, 
  labelModel: LabelModel | null, 
  strokeColor: string, 
  strokeWidth: number, 
  points: PointModel[], 
  group: string = '', 
): Annotation {
 
  if (points.length < 3) {
    throw new Error('Polygon requires at least 3 points');
  }

  const geometry: Geometry = {
    type: 'polygon',
    points: points
  };

  const annotation: Annotation = {
    id: id,
    type: 'Annotation',
    body: this.createAnnotationBody(labelModel?.labelName, group),
    target: {
      selector: {
        type: 'SvgSelector',
        geometry: geometry
      }
    },
    style: {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      fill: 'none',
      fillOpacity: 0.1
    }
  };

  // Add label if labelModel is provided
  if (labelModel && labelModel.labelName) {
    annotation.label = this.createLabelFromModel(labelModel);
  }

  return annotation;
}

/**
 * Creates a Rectangle Annotation Object with LabelModel support
 */
rectangle(
  id: string, 
  labelModel: LabelModel | null, 
  strokeColor: string, 
  strokeWidth: number, 
  coordinates: string, 
  group: string = '', 
): Annotation {
  const coords = coordinates.split(',').map(Number);
  if (coords.length !== 4) {
    throw new Error('Rectangle coordinates must be in format "x,y,width,height"');
  }

  const [x, y, width, height] = coords;
  
  const annotation: Annotation = {
    id: id,
    type: 'Annotation',
    body: this.createAnnotationBody(labelModel?.labelName, group),
    target: {
      selector: {
        type: 'SvgSelector',
        geometry: {
          type: 'rectangle',
          x, y, width, height
        }
      }
    },
    style: {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      fill: 'none',
      fillOpacity: 0.1
    }
  };

  // Add label if labelModel is provided
  if (labelModel && labelModel.labelName) {
    annotation.label = this.createLabelFromModel(labelModel);
  }

  return annotation;
}

/**
 * Creates a Polyline Arrow Annotation Object with LabelModel support
 */
polylineArrow(
  id: string,
  labelModel: LabelModel | null,
  strokeColor: string,
  strokeWidth: number,
  coordinates: number[][],
  group: string = '',
  directions: ('up' | 'down' | 'both')[]
): Annotation {
  const points = coordinates.map(([x, y]) => ({ x, y }));
  
  if (points.length < 2) {
    throw new Error('Polyline arrow requires at least 2 points');
  }

  const annotation: Annotation = {
    id: id,
    type: 'Annotation',
    body: this.createAnnotationBody(labelModel?.labelName, group),
    target: {
      selector: {
        type: 'SvgSelector',
        geometry: {
          type: 'polyline-arrow',
          points,
          arrows : directions.map((direction, index) => {
            return {
              startIndex: index,
              endIndex: index + 1,
              direction: direction
            };
          })
        }
      }
    },
    style: {
      stroke: strokeColor,
      strokeWidth: strokeWidth,
      fill: 'none',
      fillOpacity: 0.1
    }
  };

  // Add label if labelModel is provided
  if (labelModel && labelModel.labelName) {
    annotation.label = this.createLabelFromModel(labelModel);
  }

  return annotation;
}

/**
 * Create TextGeometry from LabelModel
 */
private createLabelFromModel(labelModel: LabelModel): TextGeometry {
  return {
    type: 'text',
    text: labelModel.labelName,
    x: labelModel.point.x,
    y: labelModel.point.y,
    style: {
      fontSize: labelModel.textSize,
      fill: labelModel.strokeColor,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal'
    }
  };
}


/**
 * Reverse conversion: Extract LabelModel from annotation
 */
extractLabelModelFromAnnotation(annotation: Annotation): LabelModel | null {
  if (!annotation.label) {
    return null;
  }

  return {
    labelName: annotation.label.text,
    point: {
      x: annotation.label.x,
      y: annotation.label.y
    },
    strokeColor: annotation.label.style?.fill || "#FF000000",
    textSize: annotation.label.style?.fontSize || 17
  };
}

// Helper method remains the same but now takes labelName from LabelModel
private createAnnotationBody(labelName?: string, group?: string): AnnotationBody[] {
  const body: AnnotationBody[] = [];
  
  if (labelName) {
    body.push({
      type: 'TextualBody',
      purpose: 'tagging',
      value: labelName
    });
  }

  if (group) {
    body.push({
      type: 'TextualBody',
      purpose: 'classifying',
      value: `${group}`
    });
  }

  return body;
}



}