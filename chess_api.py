import requests
import chess.pgn
import io
import logging
import time
import random

# Set up logging
logger = logging.getLogger(__name__)

# Headers to make requests look like a real browser (helps avoid Cloudflare protection)
DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.chess.com/',
    'Origin': 'https://www.chess.com',
}

def make_request_with_retry(url, max_retries=3, base_delay=2, max_delay=60):
    """
    Make an HTTP request with retry logic for rate limiting and Cloudflare protection.
    
    Args:
        url: URL to request
        max_retries: Maximum number of retry attempts
        base_delay: Base delay in seconds for exponential backoff
        max_delay: Maximum delay in seconds
    
    Returns:
        Response object
    """
    for attempt in range(max_retries):
        try:
            logger.debug(f"Request attempt {attempt + 1}/{max_retries} for {url}")
            
            # Add random jitter to avoid thundering herd
            if attempt > 0:
                delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
                # Add random jitter of up to 50% of delay
                jitter = random.uniform(0, delay * 0.5)
                total_delay = delay + jitter
                logger.info(f"Rate limited or blocked. Waiting {total_delay:.2f}s before retry {attempt + 1}/{max_retries}")
                time.sleep(total_delay)
            
            response = requests.get(url, headers=DEFAULT_HEADERS, timeout=15)
            
            # Check for rate limiting or Cloudflare protection
            if response.status_code == 403:
                # Check if it's a Cloudflare challenge page
                if 'Just a moment' in response.text or 'cloudflare' in response.text.lower():
                    logger.warning(f"Cloudflare protection detected (403) on attempt {attempt + 1}")
                    if attempt < max_retries - 1:
                        continue
                    else:
                        raise ValueError(f"Chess.com API blocked request after {max_retries} attempts. This may be due to rate limiting or Cloudflare protection. Please try again later.")
                else:
                    # Some other 403 error
                    raise ValueError(f"Chess.com API returned 403 Forbidden: {response.text[:200]}")
            
            # Check for rate limiting (429)
            if response.status_code == 429:
                logger.warning(f"Rate limited (429) on attempt {attempt + 1}")
                if attempt < max_retries - 1:
                    continue
                else:
                    raise ValueError(f"Rate limited by Chess.com API after {max_retries} attempts. Please try again later.")
            
            # Success
            return response
            
        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error on attempt {attempt + 1}: {str(e)}")
            if attempt < max_retries - 1:
                continue
            else:
                raise
    
    raise ValueError(f"Failed to fetch {url} after {max_retries} attempts")

def get_pgns(player_id, limit = None, blunder_params = {}):
    '''
    Returns a list of string pgns from a given chess.com player id.

    param player_id: string, the id/username of the player
    param limit: int, optional, the max number of (most recent) games to fetch/return
    '''
    logger.info(f"Fetching PGNs for player: {player_id}, limit: {limit}")

    url = 'https://api.chess.com/pub/player/' + player_id + '/games/archives'
    logger.debug(f"Fetching archives from: {url}")
    
    try:
        response = make_request_with_retry(url)
        logger.debug(f"Archive API response status: {response.status_code}")
        
        if not response.ok:
            logger.error(f"Failed to fetch archives. Status: {response.status_code}, Response: {response.text[:200]}")
            raise ValueError(f"Chess.com API returned status {response.status_code}: {response.text[:200]}")
        
        try:
            archive_data = response.json()
            logger.debug(f"Successfully parsed archive JSON. Keys: {list(archive_data.keys())}")
        except ValueError as e:
            logger.error(f"Failed to parse archive JSON. Status: {response.status_code}, Response text: {response.text[:500]}")
            raise ValueError(f"Invalid JSON response from Chess.com API: {str(e)}. Response: {response.text[:200]}")
        
        if 'archives' not in archive_data:
            logger.error(f"Missing 'archives' key in response. Available keys: {list(archive_data.keys())}, Response: {response.text[:500]}")
            raise ValueError(f"Invalid response format from Chess.com API: missing 'archives' key")
        
        archive_list = archive_data['archives']
        logger.info(f"Found {len(archive_list)} archive URLs")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error fetching archives: {str(e)}")
        raise ValueError(f"Network error connecting to Chess.com API: {str(e)}")
    
    all_pgns = []

    # IMPORTANT: process most recent archives FIRST (those at the END of the list)
    # To get most recent games, process archives in reverse and process games in reverse within each archive
    for i, link in enumerate(reversed(archive_list)):
        logger.info(f"Processing archive {len(archive_list)-i}/{len(archive_list)}: {link}")
        
        if limit is not None and len(all_pgns) >= limit:
            logger.info(f"Reached limit of {limit} games, stopping archive processing")
            break

        try:
            # Add small delay between archive requests to avoid rate limiting
            if i > 0:
                delay = random.uniform(0.5, 1.5)  # Random delay between 0.5-1.5 seconds
                logger.debug(f"Waiting {delay:.2f}s before next archive request (rate limiting protection)")
                time.sleep(delay)
            
            response = make_request_with_retry(link, max_retries=2)  # Fewer retries for individual archives
            logger.debug(f"Archive link response status: {response.status_code}")
            
            if not response.ok:
                logger.warning(f"Skipping archive {link} due to status {response.status_code}: {response.text[:200]}")
                continue
            
            try:
                games_data = response.json()
                logger.debug(f"Successfully parsed games JSON from archive. Keys: {list(games_data.keys())}")
            except ValueError as e:
                logger.warning(f"Failed to parse JSON from archive {link}: {str(e)}. Response: {response.text[:200]}")
                continue
            
            if 'games' not in games_data:
                logger.warning(f"Missing 'games' key in archive response for {link}. Available keys: {list(games_data.keys())}")
                continue
            
            games = games_data['games']
            logger.debug(f"Found {len(games)} games in archive")

            # Most recent games are last in archive, so reverse the list
            games = list(reversed(games))

            for game in games:
                if 'pgn' in game:
                    all_pgns.append(game['pgn'])
                    if limit is not None and len(all_pgns) >= limit:
                        logger.info(f"Reached limit of {limit} games, stopping game fetching")
                        break
            if limit is not None and len(all_pgns) >= limit:
                break

        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error fetching archive {link}: {str(e)}, skipping")
            continue

    if limit is not None and len(all_pgns) > limit:
        logger.info(f"Truncating {len(all_pgns)} PGNs to limit of {limit}")
        all_pgns = all_pgns[:limit]

    logger.info(f"Successfully fetched {len(all_pgns)} PGNs for player {player_id}")
    return all_pgns