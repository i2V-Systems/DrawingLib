import { Tool } from '../../core/tools/Tool';
import { Point } from '../types';
import { GroupManager } from '../../core/groups/GroupManager';

export interface GroupToolOptions {
  selectionColor?: string;
  groupNamePrompt?: boolean;
}

export class GroupTool implements Tool {
  name = 'group';
  
  private svg: SVGSVGElement;
  private groupManager: GroupManager;
  private selectionRect: SVGRectElement | null = null;
  private startPoint: Point | null = null;
  private options: Required<GroupToolOptions>;

  constructor(
    svg: SVGSVGElement,
    groupManager: GroupManager,
    options: GroupToolOptions = {}
  ) {
    this.svg = svg;
    this.groupManager = groupManager;
    this.options = {
      selectionColor: 'rgba(74, 144, 226, 0.3)',
      groupNamePrompt: true,
      ...options
    };
  }

  activate(): void {
    // Optional setup when tool is activated
  }

  deactivate(): void {
    this.cleanup();
  }

  handleMouseDown(point: Point, event: MouseEvent): void {
    if (event.button === 0) { // Left click only
      this.startPoint = point;
      
      // Create selection rectangle
      this.selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      this.selectionRect.setAttribute('class', 'annotorious-group-selection');
      this.selectionRect.setAttribute('x', point.x.toString());
      this.selectionRect.setAttribute('y', point.y.toString());
      this.selectionRect.setAttribute('width', '0');
      this.selectionRect.setAttribute('height', '0');
      this.selectionRect.style.fill = this.options.selectionColor;
      this.selectionRect.style.pointerEvents = 'none';
      
      this.svg.appendChild(this.selectionRect);
    }
  }

  handleMouseMove(point: Point, event: MouseEvent): void {
    if (this.startPoint && this.selectionRect) {
      const x = Math.min(this.startPoint.x, point.x);
      const y = Math.min(this.startPoint.y, point.y);
      const width = Math.abs(point.x - this.startPoint.x);
      const height = Math.abs(point.y - this.startPoint.y);
      
      this.selectionRect.setAttribute('x', x.toString());
      this.selectionRect.setAttribute('y', y.toString());
      this.selectionRect.setAttribute('width', width.toString());
      this.selectionRect.setAttribute('height', height.toString());
    }
  }

  handleMouseUp(point: Point, event: MouseEvent): void {
    if (this.startPoint && this.selectionRect) {
      const bounds = {
        x: Math.min(this.startPoint.x, point.x),
        y: Math.min(this.startPoint.y, point.y),
        width: Math.abs(point.x - this.startPoint.x),
        height: Math.abs(point.y - this.startPoint.y)
      };

      // Find annotations within selection bounds
      const selectedAnnotations = this.findAnnotationsInBounds(bounds);
      
      if (selectedAnnotations.length > 0) {
        if (this.options.groupNamePrompt) {
          this.promptForGroupName(selectedAnnotations);
        } else {
          this.createGroup('New Group', selectedAnnotations);
        }
      }
      
      this.cleanup();
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cleanup();
    }
  }

  private findAnnotationsInBounds(bounds: { x: number; y: number; width: number; height: number }): string[] {
    const selectedIds: string[] = [];
    
    // Get all visible annotation elements
    const annotations = this.svg.querySelectorAll('.annotorious-shape') as NodeListOf<SVGGElement>;
    
    annotations.forEach((annotation) => {
      const bbox = annotation.getBBox();
      const annotationBounds = {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
      
      if (this.boundsIntersect(bounds, annotationBounds)) {
        const id = annotation.getAttribute('data-id');
        if (id) {
          selectedIds.push(id);
        }
      }
    });
    
    return selectedIds;
  }

  private boundsIntersect(
    b1: { x: number; y: number; width: number; height: number },
    b2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      b2.x > b1.x + b1.width ||
      b2.x + b2.width < b1.x ||
      b2.y > b1.y + b1.height ||
      b2.y + b2.height < b1.y
    );
  }

  private promptForGroupName(annotationIds: string[]): void {
    // Create prompt container
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    const container = document.createElement('div');
    container.style.backgroundColor = '#fff';
    container.style.padding = '8px';
    container.style.borderRadius = '4px';
    container.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    
    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter group name';
    input.style.width = '200px';
    input.style.padding = '4px';
    input.style.border = '1px solid #ddd';
    input.style.borderRadius = '2px';
    
    // Create buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '8px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.justifyContent = 'flex-end';
    
    const createButton = document.createElement('button');
    createButton.textContent = 'Create';
    createButton.style.padding = '4px 8px';
    createButton.style.backgroundColor = '#4a90e2';
    createButton.style.color = '#fff';
    createButton.style.border = 'none';
    createButton.style.borderRadius = '2px';
    createButton.style.cursor = 'pointer';
    
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '4px 8px';
    cancelButton.style.backgroundColor = '#f5f5f5';
    cancelButton.style.border = 'none';
    cancelButton.style.borderRadius = '2px';
    cancelButton.style.cursor = 'pointer';
    
    // Add elements to container
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(createButton);
    container.appendChild(input);
    container.appendChild(buttonContainer);
    foreignObject.appendChild(container);
    
    // Position the prompt
    const svgRect = this.svg.getBoundingClientRect();
    foreignObject.setAttribute('x', (svgRect.width / 2 - 100).toString());
    foreignObject.setAttribute('y', (svgRect.height / 2 - 50).toString());
    foreignObject.setAttribute('width', '220');
    foreignObject.setAttribute('height', '80');
    
    this.svg.appendChild(foreignObject);
    input.focus();
    
    // Handle events
    const handleCreate = () => {
      const name = input.value.trim();
      if (name) {
        this.createGroup(name, annotationIds);
      }
      this.svg.removeChild(foreignObject);
    };
    
    const handleCancel = () => {
      this.svg.removeChild(foreignObject);
    };
    
    createButton.addEventListener('click', handleCreate);
    cancelButton.addEventListener('click', handleCancel);
    input.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') {
        handleCreate();
      } else if (evt.key === 'Escape') {
        handleCancel();
      }
    });
  }

  private createGroup(name: string, annotationIds: string[]): void {
    this.groupManager.createGroup(name, annotationIds, {
      color: this.options.selectionColor
    });
  }

  private cleanup(): void {
    if (this.selectionRect && this.selectionRect.parentNode) {
      this.selectionRect.parentNode.removeChild(this.selectionRect);
      this.selectionRect = null;
    }
    this.startPoint = null;
  }
}
