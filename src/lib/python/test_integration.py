import json
import subprocess
import sys
import os

def run_geometry_helper(payload):
    script_path = os.path.join(os.path.dirname(__file__), 'geometry_helper.py')
    process = subprocess.Popen(
        ['python3', script_path],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    stdout, stderr = process.communicate(input=json.dumps(payload))
    return json.loads(stdout)

def test_no_violations():
    payload = {
        "elements": [
            {"id": "headline", "type": "headline", "x": 10, "y": 10, "width": 80, "height": 15},
            {"id": "subheadline", "type": "subheadline", "x": 10, "y": 30, "width": 80, "height": 10},
            {"id": "cta", "type": "cta", "x": 35, "y": 75, "width": 30, "height": 8}
        ],
        "faceRegions": [],
        "productRegions": [],
        "margins": 8.0
    }
    res = run_geometry_helper(payload)
    assert res['score'] == 100, f"Expected 100, got {res['score']}"
    assert len(res['issues']) == 0
    print("✓ Test No Violations: Passed")

def test_face_collision():
    payload = {
        "elements": [
            {"id": "headline", "type": "headline", "x": 10, "y": 15, "width": 80, "height": 15}
        ],
        "faceRegions": [
            {"x": 20, "y": 10, "width": 30, "height": 30, "label": "Face #1"}
        ],
        "productRegions": [],
        "margins": 8.0
    }
    res = run_geometry_helper(payload)
    assert res['score'] < 100, "Expected score deduction for face collision"
    assert any("headline" in iss and "Face #1" in iss for iss in res['issues'])
    print("✓ Test Face Collision: Passed")

def test_text_overlap():
    payload = {
        "elements": [
            {"id": "headline", "type": "headline", "x": 10, "y": 10, "width": 80, "height": 15},
            {"id": "subheadline", "type": "subheadline", "x": 10, "y": 20, "width": 80, "height": 15} # Overlaps headline y2=25 with y1=20
        ],
        "faceRegions": [],
        "productRegions": [],
        "margins": 8.0
    }
    res = run_geometry_helper(payload)
    assert res['score'] < 100, "Expected score deduction for text overlap"
    assert len(res['textOverlaps']) > 0
    print("✓ Test Text Overlap: Passed")

def test_margin_violation():
    payload = {
        "elements": [
            {"id": "headline", "type": "headline", "x": 3, "y": 10, "width": 80, "height": 15} # Left boundary is 3% < 8% margin
        ],
        "faceRegions": [],
        "productRegions": [],
        "margins": 8.0
    }
    res = run_geometry_helper(payload)
    assert res['score'] < 100, "Expected score deduction for margin violation"
    assert len(res['marginViolations']) > 0
    print("✓ Test Margin Violation: Passed")

if __name__ == '__main__':
    print("Starting geometry engine integration tests...")
    try:
        test_no_violations()
        test_face_collision()
        test_text_overlap()
        test_margin_violation()
        print("All geometry engine tests passed successfully!")
    except AssertionError as e:
        print(f"Test failed: {e}")
        sys.exit(1)
