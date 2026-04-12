# GTBank PDF Form Filler

A client-side web application that fills GTBank business account opening forms with customer data and downloads the completed PDF.

## Features

- Upload GTBank PDF templates
- Fill customer information (name, BVN, business details, etc.)
- Automatic text overlay on static PDFs
- Download filled PDF with 100% visual fidelity
- Preview filled data before processing
- Mobile-responsive design

## Setup

1. Open `index.html` in a modern web browser (Chrome, Firefox, Edge)
2. No server required - runs entirely in the browser

## Usage

1. Select the appropriate GTBank PDF form from your Downloads folder
2. Fill in the customer details
3. Click "Preview" to review the data
4. Click "Fill & Download PDF" to generate and download the completed form

## Customizing Field Mappings

Since GTBank forms are static PDFs (not fillable), the app overlays text at specific coordinates. Each form type needs its own mapping configuration.

### How to Configure Mappings

1. Open the PDF in a PDF viewer (Adobe Reader, Chrome)
2. Note the exact coordinates (x, y) where each field should appear
3. Edit `fieldMappings.json` to add/update coordinates for each form type

### Coordinate System

- **x, y**: Position in points (72 points = 1 inch)
- **page**: Page number (0-based index)
- **fontSize**: Text size in points

Example mapping:

```json
"Sole Proprietorship": {
  "fullName": { "x": 100, "y": 700, "page": 0, "fontSize": 12 }
}
```

### Finding Coordinates

1. Open PDF in Chrome browser
2. Right-click > Inspect
3. Use the ruler tool or measure from page edges
4. Test with sample data and adjust as needed

## Supported Forms

Based on analysis:

- Account-Opening-Documentation-Sole-Proprietorship-Partnership-Form-Jan-2026.pdf (20 pages)
- GAPS-and-GAPS-Lite-Corporate-Internet-Banking-Form.pdf (3 pages)
- Account-Opening-Documentation-Trustees\_-Jan-2026.pdf (22 pages)
- Account-Opening-Form-Unincorporated-Societies-Account_Jan-2026.pdf (20 pages)
- Account-Opening-Documentation-Corporate-Jan-2026.pdf (21 pages)

## Technical Details

- Uses `pdf-lib` library for PDF manipulation
- Client-side processing (no data sent to servers)
- Supports static PDF templates with coordinate-based text placement
- Validation for required fields and BVN format

## Future Enhancements

- Backend API for secure PDF storage and email delivery
- OCR for automatic field detection
- Batch processing for multiple customers
- Integration with CRM systems

## Troubleshooting

- **PDF not filling correctly**: Check field mappings in `fieldMappings.json`
- **Download not working**: Ensure browser allows file downloads
- **Large PDFs**: May take time to process; wait for completion message
