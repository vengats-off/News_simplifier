from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import requests
import re
import time
from datetime import datetime, timedelta
from urllib.parse import quote_plus, urlparse
import json
from bs4 import BeautifulSoup
import nltk
from textstat import flesch_reading_ease
import logging

# Download required NLTK data
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
except:
    pass

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    # NewsAPI key (get from https://newsapi.org/)
    NEWSAPI_KEY = "your_newsapi_key_here"  # Replace with your actual API key
    
    # Alternative news sources
    NEWS_SOURCES = [
        'https://economictimes.indiatimes.com',
        'https://www.business-standard.com',
        'https://www.livemint.com',
        'https://www.moneycontrol.com'
    ]

# Financial jargon dictionary
FINANCIAL_JARGON = {
    'bull market': 'a period when stock prices are rising and investor confidence is high',
    'bear market': 'a period when stock prices are falling by 20% or more from recent highs',
    'market capitalization': 'the total value of all a company\'s shares in the stock market',
    'market cap': 'the total value of all a company\'s shares',
    'volatility': 'how much and how quickly stock prices move up and down',
    'liquidity': 'how easily an investment can be bought or sold',
    'revenue': 'total money a company earns from sales',
    'profit margin': 'percentage of sales that becomes profit after expenses',
    'EBITDA': 'company earnings before paying interest, taxes, depreciation, and amortization',
    'quarterly results': 'a company\'s financial performance report for 3 months',
    'annual report': 'yearly document showing company\'s financial performance',
    'fiscal year': 'a company\'s 12-month accounting period',
    'dividend': 'regular cash payments companies make to shareholders',
    'dividend yield': 'annual dividend payments as percentage of stock price',
    'P/E ratio': 'compares stock price to company\'s earnings per share',
    'price-to-earnings ratio': 'compares stock price to earnings per share',
    'equity': 'ownership stake in a company through shares',
    'portfolio': 'collection of different investments',
    'IPO': 'Initial Public Offering - when company sells shares to public first time',
    'yield': 'income return on investment as percentage',
    'debt-to-equity ratio': 'compares company\'s debt to shareholders\' equity',
    'current ratio': 'measures company\'s ability to pay short-term debts',
    'ROI': 'Return on Investment - profit relative to amount invested',
    'ROE': 'Return on Equity - how efficiently company uses shareholders\' money',
    'gross margin': 'percentage of revenue left after cost of goods sold',
    'inflation': 'general increase in prices over time',
    'GDP': 'total value of goods and services produced by country',
    'interest rates': 'cost of borrowing money as annual percentage',
    'federal reserve': 'central bank that controls monetary policy',
    'merger': 'when two companies combine into one',
    'acquisition': 'when one company buys another',
    'restructuring': 'major changes to company operations or finances',
    'leverage': 'using borrowed money to increase potential returns',
    'recession': 'period of economic decline with reduced business activity',
    'rally': 'period of sustained price increases',
    'correction': 'decline of 10% or more from recent high',
    'balance sheet': 'statement showing assets, liabilities, and equity',
    'cash flow': 'movement of money in and out of business',
    'working capital': 'short-term assets minus short-term liabilities',
    'shareholders equity': 'company value belonging to owners after debts'
}

# Complex phrases to simplify
PHRASE_REPLACEMENTS = {
    'pursuant to': 'according to',
    'in accordance with': 'following',
    'notwithstanding': 'despite',
    'heretofore': 'previously',
    'hereafter': 'from now on',
    'whereas': 'while',
    'commenced': 'started',
    'terminate': 'end',
    'utilize': 'use',
    'demonstrate': 'show',
    'facilitate': 'help',
    'substantial': 'large',
    'significant': 'important',
    'optimize': 'improve',
    'enhance': 'make better',
    'mitigate': 'reduce'
}

class NewsSimplifier:
    def __init__(self):
        self.newsapi_key = Config.NEWSAPI_KEY
    
    def fetch_news_from_newsapi(self, query, language='en', sort_by='publishedAt', page_size=20):
        """Fetch news from NewsAPI"""
        try:
            url = 'https://newsapi.org/v2/everything'
            params = {
                'q': query,
                'language': language,
                'sortBy': sort_by,
                'pageSize': page_size,
                'apiKey': self.newsapi_key
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return data.get('articles', [])
            
        except Exception as e:
            logger.error(f"NewsAPI error: {str(e)}")
            return []
    
    def fetch_news_from_web_scraping(self, query):
        """Fallback: Scrape news from Indian financial websites"""
        articles = []
        
        try:
            # Economic Times
            et_articles = self.scrape_economic_times(query)
            articles.extend(et_articles)
            
            # Add small delay to be respectful
            time.sleep(1)
            
        except Exception as e:
            logger.error(f"Web scraping error: {str(e)}")
        
        return articles
    
    def scrape_economic_times(self, query):
        """Scrape Economic Times for financial news"""
        articles = []
        try:
            search_url = f"https://economictimes.indiatimes.com/topic/{quote_plus(query)}"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(search_url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find article elements (adjust selectors based on actual site structure)
            article_elements = soup.find_all('div', class_=['story', 'eachStory'])
            
            for element in article_elements[:10]:  # Limit to 10 articles
                try:
                    title_elem = element.find('a')
                    if title_elem:
                        title = title_elem.get_text(strip=True)
                        url = title_elem.get('href')
                        if url and not url.startswith('http'):
                            url = 'https://economictimes.indiatimes.com' + url
                        
                        # Get article content
                        content = self.extract_article_content(url) if url else ""
                        
                        articles.append({
                            'title': title,
                            'description': content[:200] + '...' if len(content) > 200 else content,
                            'url': url,
                            'source': {'name': 'Economic Times'},
                            'publishedAt': datetime.now().isoformat(),
                            'content': content
                        })
                        
                except Exception as e:
                    logger.error(f"Error parsing article element: {str(e)}")
                    continue
                    
        except Exception as e:
            logger.error(f"Economic Times scraping error: {str(e)}")
        
        return articles
    
    def extract_article_content(self, url):
        """Extract main content from article URL"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove unwanted elements
            for element in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
                element.decompose()
            
            # Try to find main content
            content_selectors = [
                '.story_content',
                '.articleBody',
                '.story-body',
                '.content',
                'article',
                '.post-content'
            ]
            
            content = ""
            for selector in content_selectors:
                content_elem = soup.select_one(selector)
                if content_elem:
                    content = content_elem.get_text(strip=True)
                    break
            
            # If no specific content found, get all paragraphs
            if not content:
                paragraphs = soup.find_all('p')
                content = ' '.join([p.get_text(strip=True) for p in paragraphs])
            
            return content
            
        except Exception as e:
            logger.error(f"Content extraction error: {str(e)}")
            return ""
    
    def detect_financial_jargon(self, text):
        """Detect financial jargon in text"""
        detected_jargon = []
        text_lower = text.lower()
        
        for term, explanation in FINANCIAL_JARGON.items():
            # Use word boundary regex to avoid partial matches
            pattern = r'\b' + re.escape(term.lower()) + r'\b'
            matches = re.findall(pattern, text_lower)
            if matches:
                detected_jargon.append({
                    'term': term,
                    'explanation': explanation,
                    'count': len(matches)
                })
        
        return sorted(detected_jargon, key=lambda x: x['count'], reverse=True)
    
    def simplify_text(self, text, level='basic'):
        """Simplify financial text"""
        simplified = text
        replacements = []
        
        # Replace financial jargon
        for term, explanation in FINANCIAL_JARGON.items():
            pattern = r'\b' + re.escape(term) + r'\b'
            if re.search(pattern, simplified, re.IGNORECASE):
                if level == 'expert':
                    replacement = f"{term} ({explanation})"
                elif level == 'detailed':
                    replacement = f"{explanation} ({term})"
                else:  # basic
                    replacement = explanation
                
                simplified = re.sub(pattern, replacement, simplified, flags=re.IGNORECASE)
                replacements.append({
                    'original': term,
                    'replacement': replacement
                })
        
        # Replace complex phrases
        for complex_phrase, simple_phrase in PHRASE_REPLACEMENTS.items():
            pattern = r'\b' + re.escape(complex_phrase) + r'\b'
            if re.search(pattern, simplified, re.IGNORECASE):
                simplified = re.sub(pattern, simple_phrase, simplified, flags=re.IGNORECASE)
                replacements.append({
                    'original': complex_phrase,
                    'replacement': simple_phrase
                })
        
        return {
            'text': simplified,
            'replacements': replacements
        }
    
    def calculate_complexity(self, text, jargon_count):
        """Calculate text complexity level"""
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        avg_word_length = sum(len(word) for word in words) / len(words) if words else 0
        avg_sentence_length = len(words) / len(sentences) if sentences else 0
        
        complexity_score = 0
        
        # Jargon factor
        if jargon_count >= 10:
            complexity_score += 4
        elif jargon_count >= 6:
            complexity_score += 3
        elif jargon_count >= 3:
            complexity_score += 2
        elif jargon_count >= 1:
            complexity_score += 1
        
        # Word length factor
        if avg_word_length >= 7:
            complexity_score += 3
        elif avg_word_length >= 5.5:
            complexity_score += 2
        elif avg_word_length >= 4.5:
            complexity_score += 1
        
        # Sentence length factor
        if avg_sentence_length >= 25:
            complexity_score += 3
        elif avg_sentence_length >= 18:
            complexity_score += 2
        elif avg_sentence_length >= 12:
            complexity_score += 1
        
        if complexity_score >= 7:
            return 'High'
        elif complexity_score >= 4:
            return 'Medium'
        else:
            return 'Low'
    
    def calculate_readability_score(self, text):
        """Calculate readability score using textstat"""
        try:
            score = flesch_reading_ease(text)
            return max(0, min(100, round(score)))
        except:
            return 50  # Default middle score if calculation fails
    
    def generate_insights(self, text, jargon_list):
        """Generate key insights about the text"""
        insights = []
        
        if len(jargon_list) >= 8:
            insights.append({
                'title': 'High Financial Complexity',
                'description': 'This article contains many technical terms that may be difficult for general readers.'
            })
        
        # Check for specific types of financial content
        performance_terms = ['EBITDA', 'P/E ratio', 'profit margin', 'revenue']
        if any(term in [j['term'] for j in jargon_list] for term in performance_terms):
            insights.append({
                'title': 'Company Performance Focus',
                'description': 'The article discusses important company performance indicators and financial metrics.'
            })
        
        market_terms = ['bull market', 'bear market', 'volatility', 'market cap']
        if any(term in [j['term'] for j in jargon_list] for term in market_terms):
            insights.append({
                'title': 'Market Analysis Content',
                'description': 'The content covers market conditions and trading-related information.'
            })
        
        word_count = len(text.split())
        if word_count > 500:
            insights.append({
                'title': 'Comprehensive Article',
                'description': f'This is a detailed {word_count}-word article with in-depth coverage.'
            })
        
        return insights

# Initialize the news simplifier
news_simplifier = NewsSimplifier()

@app.route('/')
def index():
    """Main page"""
    return render_template('news_simplifier.html')

@app.route('/api/search-news', methods=['POST'])
def search_news():
    """Search for news articles and return simplified versions"""
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        simplification_level = data.get('level', 'basic')
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        logger.info(f"Searching news for query: {query}")
        
        # Fetch news articles
        articles = []
        
        # Try NewsAPI first
        if news_simplifier.newsapi_key != "your_newsapi_key_here":
            articles = news_simplifier.fetch_news_from_newsapi(query + " finance")
        
        # If no articles from NewsAPI or no API key, try web scraping
        if not articles:
            articles = news_simplifier.fetch_news_from_web_scraping(query)
        
        if not articles:
            return jsonify({
                'articles': [],
                'message': 'No articles found for this query'
            })
        
        # Process and simplify articles
        simplified_articles = []
        
        for article in articles[:10]:  # Limit to 10 articles
            try:
                title = article.get('title', '')
                description = article.get('description', '')
                content = article.get('content', description)
                
                # Combine title and content for analysis
                full_text = f"{title}. {content}" if content else title
                
                # Detect jargon
                detected_jargon = news_simplifier.detect_financial_jargon(full_text)
                
                # Simplify text
                simplified_result = news_simplifier.simplify_text(full_text, simplification_level)
                
                # Calculate metrics
                complexity = news_simplifier.calculate_complexity(full_text, len(detected_jargon))
                readability_score = news_simplifier.calculate_readability_score(simplified_result['text'])
                
                # Generate insights
                insights = news_simplifier.generate_insights(full_text, detected_jargon)
                
                simplified_articles.append({
                    'original': {
                        'title': title,
                        'description': description,
                        'url': article.get('url', ''),
                        'source': article.get('source', {}).get('name', 'Unknown'),
                        'publishedAt': article.get('publishedAt', ''),
                        'content': full_text
                    },
                    'simplified': {
                        'title': news_simplifier.simplify_text(title, simplification_level)['text'],
                        'content': simplified_result['text']
                    },
                    'analysis': {
                        'jargon_detected': detected_jargon,
                        'jargon_count': len(detected_jargon),
                        'complexity': complexity,
                        'readability_score': readability_score,
                        'insights': insights,
                        'replacements': simplified_result['replacements']
                    }
                })
                
            except Exception as e:
                logger.error(f"Error processing article: {str(e)}")
                continue
        
        return jsonify({
            'articles': simplified_articles,
            'total_found': len(simplified_articles),
            'query': query,
            'simplification_level': simplification_level
        })
        
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/simplify-text', methods=['POST'])
def simplify_custom_text():
    """Simplify custom text provided by user"""
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        level = data.get('level', 'basic')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        if len(text) > 10000:
            return jsonify({'error': 'Text too long (max 10,000 characters)'}), 400
        
        # Detect jargon
        detected_jargon = news_simplifier.detect_financial_jargon(text)
        
        # Simplify text
        simplified_result = news_simplifier.simplify_text(text, level)
        
        # Calculate metrics
        complexity = news_simplifier.calculate_complexity(text, len(detected_jargon))
        readability_score = news_simplifier.calculate_readability_score(simplified_result['text'])
        
        # Generate insights
        insights = news_simplifier.generate_insights(text, detected_jargon)
        
        return jsonify({
            'original_text': text,
            'simplified_text': simplified_result['text'],
            'jargon_detected': detected_jargon,
            'jargon_count': len(detected_jargon),
            'complexity': complexity,
            'readability_score': readability_score,
            'insights': insights,
            'replacements': simplified_result['replacements']
        })
        
    except Exception as e:
        logger.error(f"Text simplification error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/trending-topics', methods=['GET'])
def get_trending_topics():
    """Get trending financial topics"""
    trending_topics = [
        'Stock Market India',
        'Sensex',
        'Nifty 50',
        'RBI Policy',
        'Indian Economy',
        'Cryptocurrency India',
        'Mutual Funds',
        'IPO India',
        'Banking Sector',
        'IT Stocks',
        'Auto Sector',
        'Real Estate India',
        'Gold Prices India',
        'Rupee Exchange Rate',
        'GST Updates'
    ]
    
    return jsonify({'trending_topics': trending_topics})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)