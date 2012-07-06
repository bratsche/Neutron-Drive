from django.views.generic import RedirectView
from django.conf.urls import patterns, include, url

urlpatterns = patterns('',
  (r'^favicon.ico', RedirectView.as_view(url='/static/favicon.ico')),
  
  url(r'^edit/shatner$', 'ndrive.main.views.shatner', name='shatner'),
  url(r'^edit$', 'ndrive.main.views.edit', name='edit'),
  url(r'^edit_old$', 'ndrive.main.views.edit_old', name='edit_old'),
  
  url(r'^about/$', 'ndrive.main.views.about', name='about'),
  url(r'^$', 'ndrive.main.views.home', name='home'),
  
  # url(r'^ndrive/', include('ndrive.foo.urls')),
)
