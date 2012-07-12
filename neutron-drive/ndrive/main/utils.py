import json
import httplib2

from django import http

from apiclient.http import MediaUpload
from apiclient.discovery import build

ALL_SCOPES = (
  'https://www.googleapis.com/auth/drive.file '
  'https://www.googleapis.com/auth/userinfo.email '
  'https://www.googleapis.com/auth/userinfo.profile'
)

def JsonResponse (data={'status': 'ok'}, ok=None):
  if ok:
    data.update(ok)
    
  return http.HttpResponse(json.dumps(data), content_type='application/json')
  
def CreateService (service, version, creds):
  http = httplib2.Http()
  creds.authorize(http)
  return build(service, version, http=http)
  
class MediaInMemoryUpload (MediaUpload):
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
    