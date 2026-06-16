"""
BigQuery Release Pulse - Flask Backend Service

This module initializes the Flask application and manages fetching, parsing,
and sanitizing the official Google Cloud BigQuery Release Notes RSS/Atom feed.

Main Endpoints:
    - / : Serves the interactive user dashboard.
    - /api/release-notes : Exposes a JSON API that retrieves and parses the XML feed,
                           splitting mixed daily release logs into individual update cards.

Author: Antigravity
Date: June 16, 2026
"""

import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

# Official source URL for the BigQuery release notes Atom feed
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    """
    Fetches the BigQuery Atom XML feed, extracts release details, parses individual 
    updates, and formats them into a clean, structured dictionary.

    The Google Cloud release notes feed combines all updates for a single day into 
    one <entry> containing mixed HTML inside the <content> tag. This function splits 
    the raw HTML content by its `<h3>` headings (e.g., 'Feature', 'Issue') to create 
    independent update objects.

    Returns:
        dict: A dictionary containing either:
            - 'entries': A list of parsed daily release logs, each containing:
                - 'date' (str): The release date (e.g., "June 15, 2026").
                - 'updated' (str): ISO timestamp of the last update.
                - 'link' (str): URL to the official release page anchor.
                - 'updates' (list of dicts): Individual updates containing:
                    - 'id' (str): Unique identifier.
                    - 'type' (str): The update category ('Feature', 'Issue', etc.).
                    - 'html' (str): Raw HTML description.
                    - 'text' (str): Stripped plaintext description (for X/Twitter).
            - 'error': A string message detailing the failure reason if any error occurred.
    """
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    
    try:
        # Perform HTTP GET request to retrieve the feed XML data
        with urllib.request.urlopen(req, timeout=12) as response:
            xml_data = response.read()
    except Exception as e:
        return {"error": f"Failed to fetch feed: {str(e)}", "entries": []}
        
    try:
        # Parse XML string structure using ElementTree
        root = ET.fromstring(xml_data)
    except Exception as e:
        return {"error": f"Failed to parse XML content: {str(e)}", "entries": []}
        
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    parsed_entries = []
    
    # Iterate through all Atom <entry> elements in the feed
    for entry in root.findall('atom:entry', ns):
        title_el = entry.find('atom:title', ns)
        date_str = title_el.text if title_el is not None else "Unknown Date"
        
        updated_el = entry.find('atom:updated', ns)
        updated_val = updated_el.text if updated_el is not None else ""
        
        # Locate alternate links or fall back to any available link
        link_url = ""
        for link in entry.findall('atom:link', ns):
            if link.attrib.get('rel') == 'alternate' or not link_url:
                link_url = link.attrib.get('href', '')
        
        content_el = entry.find('atom:content', ns)
        html_content = content_el.text if content_el is not None else ""
        
        updates = []
        # Split the HTML content by <h3> headings to separate different items
        parts = re.split(r'(?i)<h3>(.*?)</h3>', html_content)
        
        if len(parts) > 1:
            # Reassemble split blocks into (type, content) pairs
            for i in range(1, len(parts), 2):
                update_type = parts[i].strip()
                update_html = parts[i+1].strip() if i+1 < len(parts) else ""
                
                # Sanitize HTML tags out to create clean plaintext for tweeting/sharing
                clean_text = re.sub(r'<[^>]+>', '', update_html).strip()
                clean_text = re.sub(r'\s+', ' ', clean_text)
                
                updates.append({
                    "id": f"{date_str.replace(' ', '_')}_{i}",
                    "type": update_type,
                    "html": update_html,
                    "text": clean_text
                })
        else:
            # Fallback if the entry lacks <h3> dividers
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
    """
    Renders the primary application dashboard interface.

    Returns:
        str: Rendered HTML template of index.html.
    """
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    """
    API endpoint that returns the parsed release notes feed data as JSON.

    Returns:
        Response: Flask JSON response containing lists of release entries.
    """
    data = fetch_and_parse_feed()
    return jsonify(data)

if __name__ == '__main__':
    # Retrieve port configuration from environment variables, defaulting to 5001
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
