import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { describe, it, expect, vi } from 'vitest';

describe('CollapsibleSection', () => {
  const mockOnToggle = vi.fn();
  const defaultProps = {
    title: 'Test Section',
    isCollapsed: false,
    onToggle: mockOnToggle,
    children: <div>Test Content</div>,
  };

  beforeEach(() => {
    mockOnToggle.mockClear();
  });

  describe('Rendering', () => {
    it('should render the section title', () => {
      render(<CollapsibleSection {...defaultProps} />);
      expect(screen.getByText('Test Section')).toBeInTheDocument();
    });

    it('should render children when not collapsed', () => {
      render(<CollapsibleSection {...defaultProps} />);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should hide children when collapsed', () => {
      render(<CollapsibleSection {...defaultProps} isCollapsed={true} />);
      const content = screen.getByText('Test Content');
      // Content exists in DOM but is visually hidden via CSS
      expect(content).toBeInTheDocument();
      const container = content.closest('div');
      expect(container).toHaveClass('max-h-0', 'opacity-0');
    });

    it('should display count when provided', () => {
      render(<CollapsibleSection {...defaultProps} count={42} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('should not display count when not provided', () => {
      render(<CollapsibleSection {...defaultProps} />);
      const countElement = screen.queryByText(/^\d+$/);
      expect(countElement).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <CollapsibleSection {...defaultProps} className="custom-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('Interactions', () => {
    it('should call onToggle when header is clicked', () => {
      render(<CollapsibleSection {...defaultProps} />);
      const button = screen.getByRole('button', { name: /Test Section/i });
      fireEvent.click(button);
      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should not call onToggle when children are clicked', () => {
      render(<CollapsibleSection {...defaultProps} />);
      const content = screen.getByText('Test Content');
      fireEvent.click(content);
      expect(mockOnToggle).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-expanded when expanded', () => {
      render(<CollapsibleSection {...defaultProps} isCollapsed={false} />);
      const button = screen.getByRole('button', { name: /Collapse Test Section/i });
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper aria-expanded when collapsed', () => {
      render(<CollapsibleSection {...defaultProps} isCollapsed={true} />);
      const button = screen.getByRole('button', { name: /Expand Test Section/i });
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have descriptive aria-label when expanded', () => {
      render(<CollapsibleSection {...defaultProps} isCollapsed={false} />);
      expect(
        screen.getByRole('button', { name: 'Collapse Test Section section' })
      ).toBeInTheDocument();
    });

    it('should have descriptive aria-label when collapsed', () => {
      render(<CollapsibleSection {...defaultProps} isCollapsed={true} />);
      expect(
        screen.getByRole('button', { name: 'Expand Test Section section' })
      ).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      render(<CollapsibleSection {...defaultProps} />);
      const button = screen.getByRole('button', { name: /Test Section/i });
      button.focus();
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visual States', () => {
    it('should rotate chevron icon when expanded', () => {
      const { container } = render(<CollapsibleSection {...defaultProps} isCollapsed={false} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('rotate-90');
    });

    it('should not rotate chevron icon when collapsed', () => {
      const { container } = render(<CollapsibleSection {...defaultProps} isCollapsed={true} />);
      const svg = container.querySelector('svg');
      expect(svg).not.toHaveClass('rotate-90');
    });

    it('should apply transition classes to content container', () => {
      const { container } = render(<CollapsibleSection {...defaultProps} />);
      const contentWrapper = container.querySelector('.transition-all');
      expect(contentWrapper).toHaveClass('duration-200', 'ease-in-out', 'overflow-hidden');
    });

    it('should have hover styles on button', () => {
      const { container } = render(<CollapsibleSection {...defaultProps} />);
      const button = screen.getByRole('button', { name: /Test Section/i });
      expect(button).toHaveClass('hover:bg-gray-900', 'transition-colors');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<CollapsibleSection {...defaultProps} children={null} />);
      expect(screen.getByText('Test Section')).toBeInTheDocument();
    });

    it('should handle count of 0', () => {
      render(<CollapsibleSection {...defaultProps} count={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(100);
      render(<CollapsibleSection {...defaultProps} title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle rapid toggle clicks', () => {
      render(<CollapsibleSection {...defaultProps} />);
      const button = screen.getByRole('button', { name: /Test Section/i });

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnToggle).toHaveBeenCalledTimes(3);
    });
  });

  describe('Multiple Children', () => {
    it('should render multiple child elements', () => {
      render(
        <CollapsibleSection {...defaultProps}>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </CollapsibleSection>
      );

      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
      expect(screen.getByText('Child 3')).toBeInTheDocument();
    });

    it('should apply spacing classes to children wrapper', () => {
      const { container } = render(<CollapsibleSection {...defaultProps} />);
      const childrenWrapper = container.querySelector('.space-y-0\\.5');
      expect(childrenWrapper).toHaveClass('mt-1', 'px-1');
    });
  });
});
