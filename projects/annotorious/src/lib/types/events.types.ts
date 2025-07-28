export interface ArrowClickEvent {
    annotationId: string;
    startIndex: number;
    endIndex: number;
    direction: 'up' | 'down' | 'both';
    element: SVGElement;
    event: MouseEvent;
}