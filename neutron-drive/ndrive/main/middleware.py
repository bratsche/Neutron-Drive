from django.core.urlresolvers import reverse

class DriveAuth (object):
  def process_request (self, request):
    http = 'http://'
    if request.is_secure():
      http = 'https://'
      
    request.redirect_uris = (http + request.get_host() + reverse('edit'))
    