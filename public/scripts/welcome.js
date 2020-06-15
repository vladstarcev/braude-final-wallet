var pass, confirm;

$(".login-btn").on("click", function() {
  $(".login-form").slideToggle();
  $(".create-form").slideUp();
});

$(".create-btn").on("click", function() {
  $(".create-form").slideToggle();
  $(".login-form").slideUp();
});

$(".pass").on('input', function(){
  pass = $('.pass').val();
});

$(".confirm-pass").on('input', function(){
  confirm = $(".confirm-pass").val();
  if(pass && pass == confirm && $('#newUsernameError').css('display') == 'none') {
    $('.create-submit-btn').prop('disabled', false);
  } else {
    $('.create-submit-btn').prop('disabled', true);
  }
});
