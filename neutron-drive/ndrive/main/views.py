import json
import httplib2

from django import http
from django.conf import settings
from django.template.response import TemplateResponse

from apiclient.discovery import build
from apiclient.http import MediaUpload

from oauth2client.client import OAuth2WebServerFlow
from oauth2client.client import FlowExchangeError
from oauth2client.client import AccessTokenRefreshError

from oauth2client.appengine import StorageByKeyName
from oauth2client.appengine import simplejson as json

from ndrive.main.models import Credentials
from ndrive.main.utils import JsonResponse

ALL_SCOPES = (
  'https://www.googleapis.com/auth/drive.file '
  'https://www.googleapis.com/auth/userinfo.email '
  'https://www.googleapis.com/auth/userinfo.profile'
)

def home (request):
  c = {}
  return TemplateResponse(request, 'main/home.html', c)
  
def about (request):
  return TemplateResponse(request, 'main/about.html', {})
  
def CreateService(service, version, creds):
  http = httplib2.Http()
  creds.authorize(http)
  return build(service, version, http=http)
  
class DriveAuth (object):
  def __init__ (self, request):
    self.request = request
    self.userid = None
    
  def CreateOAuthFlow (self):
    flow = OAuth2WebServerFlow(
      settings.GOOGLE_API_CLIENT_ID,
      settings.GOOGLE_API_CLIENT_SECRET,
      '',   # scope
      None, # user_agent
      settings.GOOGLE_AUTH_URI,
      settings.GOOGLE_TOKEN_URI
    )
    
    uri = 'http://' + self.request.get_host()
    if self.request.is_secure():
      uri = 'https://' + self.request.get_host()
      
    flow.redirect_uri = uri + self.request.path
    return flow

  def get_credentials (self):
    code = self.request.REQUEST.get('code', '')
    if not code:
      return None
      
    oauth_flow = self.CreateOAuthFlow()
    
    try:
      creds = oauth_flow.step2_exchange(code)
      
    except FlowExchangeError:
      return None
      
    users_service = CreateService('oauth2', 'v2', creds)
    self.userid = users_service.userinfo().get().execute().get('id')
    
    StorageByKeyName(Credentials, self.userid, 'credentials').put(creds)
    return creds
    
  def redirect_auth (self):
    flow = self.CreateOAuthFlow()
    flow.scope = ALL_SCOPES
    uri = flow.step1_get_authorize_url(flow.redirect_uri)
    return http.HttpResponseRedirect(uri)
    
def edit (request):
  da = DriveAuth(request)
  creds = da.get_credentials()
  if not creds:
    return da.redirect_auth()
    
  response = TemplateResponse(request, 'main/edit.html', {})
  response.set_signed_cookie(settings.USERID_COOKIE, value=da.userid, salt=settings.SALT)
  
  return response
  
def GetSessionCredentials (request):
  userid = request.get_signed_cookie(settings.USERID_COOKIE, default=None, salt=settings.SALT)
  if userid:
    creds = StorageByKeyName(Credentials, userid, 'credentials').get()
    if creds and creds.invalid:
      return None
  
    return creds
    
  return None
  
def CreateDrive (request):
  
  if creds:
    return CreateService('drive', 'v1', creds)
    
  return None
  
def shatner (request):
  creds = GetSessionCredentials(request)
  import logging
  logging.info(creds)
  service = CreateService('drive', 'v1', creds)
  
  if service is None:
    return JsonResponse({'status': 'no_service'})
    
  data = json.loads(request.body)

  resource = {
    'title': data['title'],
    'description': data['description'],
    'mimeType': data['mimeType']
  }
  
  try:
    resource = service.files().insert(body=resource, media_body=MediaInMemoryUpload(data.get('content', ''), data['mimeType'])).execute()
    return JsonResponse({'status': 'ok', 'fileid': resource['id']})
    
  except AccessTokenRefreshError:
    return JsonResponse({'status': 'auth_needed'})
    
class MediaInMemoryUpload(MediaUpload):
  def __init__ (self, body, mimetype='application/octet-stream', chunksize=256*1024, resumable=False):
    self._body = body
    self._mimetype = mimetype
    self._resumable = resumable
    self._chunksize = chunksize

  def chunksize (self):
    return self._chunksize

  def mimetype(self):
    return self._mimetype

  def size(self):
    return len(self._body)

  def resumable(self):
    return self._resumable

  def getbytes(self, begin, length):
    return self._body[begin:begin + length]
    