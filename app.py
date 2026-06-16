import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# Cache for release notes
# Since it's a RSS feed, we can store it in memory for a small duration or fetch it dynamically.
# Let's fetch dynamically but handle caching or error fallbacks so the app is fast and reliable.

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            xml_data = response.read()
    except Exception as e:
        return {"error": f"Failed to fetch feed: {str(e)}", "entries": []}
        
    try:
        # Some XML files have external entities or declarations, ET.fromstring handles standard XML well
        root = ET.fromstring(xml_data)
    except Exception as e:
        return {"error": f"Failed to parse XML content: {str(e)}", "entries": []}
        
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    parsed_entries = []
    
    for entry in root.findall('atom:entry', ns):
        title_el = entry.find('atom:title', ns)
        date_str = title_el.text if title_el is not None else "Unknown Date"
        
        updated_el = entry.find('atom:updated', ns)
        updated_val = updated_el.text if updated_el is not None else ""
        
        # Find link with rel="alternate" or just any link
        link_url = ""
        for link in entry.findall('atom:link', ns):
            if link.attrib.get('rel') == 'alternate' or not link_url:
                link_url = link.attrib.get('href', '')
        
        content_el = entry.find('atom:content', ns)
        html_content = content_el.text if content_el is not None else ""
        
        # Parse updates from entry html content
        updates = []
        # We split by <h3> headings (e.g. <h3>Feature</h3>, <h3>Issue</h3>, etc.)
        parts = re.split(r'(?i)<h3>(.*?)</h3>', html_content)
        
        if len(parts) > 1:
            for i in range(1, len(parts), 2):
                update_type = parts[i].strip()
                update_html = parts[i+1].strip() if i+1 < len(parts) else ""
                
                # Extract clean text for sharing/tweeting
                clean_text = re.sub(r'<[^>]+>', '', update_html).strip()
                clean_text = re.sub(r'\s+', ' ', clean_text)
                
                updates.append({
                    "id": f"{date_str.replace(' ', '_')}_{i}",
                    "type": update_type,
                    "html": update_html,
                    "text": clean_text
                })
        else:
            # Fallback if no <h3> tags
            clean_text = re.sub(r'<[^>]+>', '', html_content).strip()
            clean_text = re.sub(r'\s+', ' ', clean_text)
            updates.append({
                "id": f"{date_str.replace(' ', '_')}_0",
                "type": "Update",
                "html": html_content,
                "text": clean_text
            })
            
        parsed_entries.append({
            "date": date_str,
            "updated": updated_val,
            "link": link_url,
            "updates": updates
        })
        
    return {"entries": parsed_entries}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    data = fetch_and_parse_feed()
    return jsonify(data)

if __name__ == '__main__':
    # Run server locally on port 5001
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
