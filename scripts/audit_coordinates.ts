import { getElementRenderStyles } from '../src/lib/rendererEngine';
import { LayoutElement, TypographyTokens } from '../src/types/agents';

// A mock element and typography tokens
const mockElement: LayoutElement = {
  id: 'headline',
  type: 'headline',
  text: 'Test Headline',
  x: 8.5,
  y: 42.1,
  width: 50.0,
  height: 12.0,
  rotation: 0,
  zIndex: 10
};

const mockTypography: TypographyTokens = {
  displayFont: 'Montserrat',
  bodyFont: 'Inter',
  headlineSize: 64,
  subheadlineSize: 32,
  bodySize: 18,
  ctaSize: 22,
  lineHeight: 1.2,
  tracking: 0,
  alignment: 'center',
  fontWeightDisplay: '700',
  fontWeightBody: '400'
};

function runAudit() {
  console.log('Running coordinate audit between Preview and Export configurations...');
  
  const styles = getElementRenderStyles(mockElement, mockTypography);
  
  // Validate that left/top/width/height percentages in styles match mockElement values exactly
  const leftVal = parseFloat(styles.left.replace('%', ''));
  const topVal = parseFloat(styles.top.replace('%', ''));
  const widthVal = parseFloat(styles.width.replace('%', ''));
  const heightVal = parseFloat(styles.height.replace('%', ''));

  const leftDiff = Math.abs(leftVal - mockElement.x);
  const topDiff = Math.abs(topVal - mockElement.y);
  const widthDiff = Math.abs(widthVal - mockElement.width);
  const heightDiff = Math.abs(heightVal - mockElement.height);

  // Allow max diff of 0.01% (floating point precision)
  const maxAllowedDiff = 0.01;
  if (leftDiff > maxAllowedDiff || topDiff > maxAllowedDiff || widthDiff > maxAllowedDiff || heightDiff > maxAllowedDiff) {
    console.error(`COORDINATE AUDIT FAILED!`);
    console.error(`Mock X: ${mockElement.x}%, Styled Left: ${styles.left}`);
    console.error(`Mock Y: ${mockElement.y}%, Styled Top: ${styles.top}`);
    console.error(`Mock Width: ${mockElement.width}%, Styled Width: ${styles.width}`);
    console.error(`Mock Height: ${mockElement.height}%, Styled Height: ${styles.height}`);
    process.exit(1);
  }
  
  console.log('✓ Coordinate audit passed successfully!');
}

runAudit();
