import sys
import json

def get_bbox(elem):
    # Standardize to percentage values (0-100)
    x = float(elem.get('x', 0))
    y = float(elem.get('y', 0))
    w = float(elem.get('width', 0))
    h = float(elem.get('height', 0))
    return {
        'x1': x,
        'y1': y,
        'x2': x + w,
        'y2': y + h,
        'id': elem.get('id', 'unknown'),
        'type': elem.get('type', 'unknown')
    }

def get_region_bbox(reg):
    x = float(reg.get('x', 0))
    y = float(reg.get('y', 0))
    w = float(reg.get('width', 0))
    h = float(reg.get('height', 0))
    return {
        'x1': x,
        'y1': y,
        'x2': x + w,
        'y2': y + h,
        'label': reg.get('label', 'region')
    }

def check_intersection(boxA, boxB):
    # Calculate overlap rectangle
    ix1 = max(boxA['x1'], boxB['x1'])
    iy1 = max(boxA['y1'], boxB['y1'])
    ix2 = min(boxA['x2'], boxB['x2'])
    iy2 = min(boxA['y2'], boxB['y2'])
    
    if ix1 < ix2 and iy1 < iy2:
        overlap_area = (ix2 - ix1) * (iy2 - iy1)
        areaA = (boxA['x2'] - boxA['x1']) * (boxA['y2'] - boxA['y1'])
        areaB = (boxB['x2'] - boxB['x1']) * (boxB['y2'] - boxB['y1'])
        min_area = min(areaA, areaB)
        
        # Intersection over union (IoU) and overlap percentage
        union_area = areaA + areaB - overlap_area
        iou = overlap_area / union_area if union_area > 0 else 0
        overlap_ratio = overlap_area / min_area if min_area > 0 else 0
        
        return {
            'intersecting': True,
            'overlap_area': overlap_area,
            'overlap_ratio': overlap_ratio,
            'iou': iou
        }
    return {'intersecting': False, 'overlap_area': 0, 'overlap_ratio': 0, 'iou': 0}

def main():
    try:
        # Read from stdin
        input_data = json.loads(sys.stdin.read())
        
        elements = input_data.get('elements', [])
        face_regions = input_data.get('faceRegions', [])
        product_regions = input_data.get('productRegions', [])
        margin_pct = float(input_data.get('margins', 8.0))
        
        element_boxes = [get_bbox(e) for e in elements]
        face_boxes = [get_region_bbox(f) for f in face_regions]
        product_boxes = [get_region_bbox(p) for p in product_regions]
        
        deductions = 0
        issues = []
        fixes = []
        
        # 1. Check face overlaps
        face_violations = []
        for e_box in element_boxes:
            # Skip backgrounds or invisible shapes
            if e_box['type'] in ['shape', 'divider'] and e_box['id'].startswith('bg'):
                continue
                
            for idx, f_box in enumerate(face_boxes):
                res = check_intersection(e_box, f_box)
                if res['intersecting'] and res['overlap_ratio'] > 0.05:
                    label = f_box['label'] or f"Face #{idx+1}"
                    face_violations.append({
                        'element': e_box['id'],
                        'region': label,
                        'overlap_ratio': res['overlap_ratio']
                    })
                    deductions += 35
                    issues.append(f"Element '{e_box['id']}' overlaps with face region '{label}' by {int(res['overlap_ratio']*100)}%.")
                    fixes.append(f"Move '{e_box['id']}' away from coordinates (x: {f_box['x1']:.1f}-{f_box['x2']:.1f}, y: {f_box['y1']:.1f}-{f_box['y2']:.1f}).")

        # 2. Check product overlaps
        product_violations = []
        for e_box in element_boxes:
            # Skip backgrounds or container shapes
            if e_box['type'] in ['shape', 'divider'] and e_box['id'].startswith('bg'):
                continue
                
            for idx, p_box in enumerate(product_boxes):
                res = check_intersection(e_box, p_box)
                if res['intersecting'] and res['overlap_ratio'] > 0.05:
                    label = p_box['label'] or f"Product #{idx+1}"
                    product_violations.append({
                        'element': e_box['id'],
                        'region': label,
                        'overlap_ratio': res['overlap_ratio']
                    })
                    deductions += 30
                    issues.append(f"Element '{e_box['id']}' overlaps with product region '{label}' by {int(res['overlap_ratio']*100)}%.")
                    fixes.append(f"Shift '{e_box['id']}' to prevent covering the product at (x: {p_box['x1']:.1f}-{p_box['x2']:.1f}, y: {p_box['y1']:.1f}-{p_box['y2']:.1f}).")

        # 3. Check margins violations (margins = margin_pct)
        margin_violations = []
        for e_box in element_boxes:
            # Skip background elements
            if e_box['type'] == 'shape' and e_box['id'] == 'canvas_bg':
                continue
                
            # If element starts before margin or ends after (100 - margin)
            violated = False
            details = []
            if e_box['x1'] < margin_pct:
                violated = True
                details.append(f"left boundary ({e_box['x1']:.1f}% < {margin_pct}%)")
            if e_box['y1'] < margin_pct:
                violated = True
                details.append(f"top boundary ({e_box['y1']:.1f}% < {margin_pct}%)")
            if e_box['x2'] > (100.0 - margin_pct):
                violated = True
                details.append(f"right boundary ({e_box['x2']:.1f}% > {100.0 - margin_pct}%)")
            if e_box['y2'] > (100.0 - margin_pct):
                violated = True
                details.append(f"bottom boundary ({e_box['y2']:.1f}% > {100.0 - margin_pct}%)")
                
            if violated:
                margin_violations.append({
                    'element': e_box['id'],
                    'details': details
                })
                deductions += 10
                issues.append(f"Element '{e_box['id']}' violates the {margin_pct}% safe margins: {', '.join(details)}.")
                fixes.append(f"Adjust size/position of '{e_box['id']}' to keep it inside the margins.")

        # 4. Check mutual overlaps between text elements
        text_overlaps = []
        for i in range(len(element_boxes)):
            boxA = element_boxes[i]
            # Only check content elements (exclude bg shapes)
            if boxA['type'] in ['shape', 'divider'] and boxA['id'].startswith('bg'):
                continue
                
            for j in range(i + 1, len(element_boxes)):
                boxB = element_boxes[j]
                if boxB['type'] in ['shape', 'divider'] and boxB['id'].startswith('bg'):
                    continue
                    
                res = check_intersection(boxA, boxB)
                if res['intersecting'] and res['overlap_ratio'] > 0.1:
                    text_overlaps.append({
                        'element_a': boxA['id'],
                        'element_b': boxB['id'],
                        'overlap_ratio': res['overlap_ratio']
                    })
                    deductions += 25
                    issues.append(f"Element '{boxA['id']}' overlaps with '{boxB['id']}' by {int(res['overlap_ratio']*100)}%.")
                    fixes.append(f"Separate '{boxA['id']}' and '{boxB['id']}' vertically or horizontally to resolve collision.")

        # Calculate score (capped at 0-100)
        score = max(0, 100 - deductions)
        
        output = {
            'score': score,
            'issues': issues,
            'fixes': fixes,
            'faceViolations': face_violations,
            'productViolations': product_violations,
            'marginViolations': margin_violations,
            'textOverlaps': text_overlaps
        }
        
        print(json.dumps(output, indent=2))
        
    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'score': 0,
            'issues': [f"Python geometry evaluator error: {str(e)}"],
            'fixes': []
        }))

if __name__ == '__main__':
    main()
