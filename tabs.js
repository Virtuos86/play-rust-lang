
//Tabs object.
function _Tabs( list, width, height, options )
{ 
	var lst = list.split(",");
	this.tabs = [];
	var curTabName = null;
	
	//Disable debug during creation.
	app.SetDebugEnabled( false );
	
	//Create main layout.
    this.lay = app.CreateLayout( "Linear", "Vertical" );
    this.lay.SetBackColor("#ffffff");
    this.lay.SetSize( width, height);
    this.lay.OnChange = null;
    this.lay.parent = this;
    
    //Create top (tab strip) layout.
    this.layTop = app.CreateLayout( "Linear", "Horizontal" );
    this.layTop.SetBackColor( "#ffffff" );
    this.lay.AddChild( this.layTop ); 
    
    //Create body layout.
    this.layBody = app.CreateLayout( "Frame", "" );
    this.layBody.SetSize( width, height-0.05);
    this.lay.AddChild( this.layBody ); 
    
    //Add a tab.
    this.AddTab = function( name )
    {
		app.SetDebugEnabled( false );
		this.layTab = app.CreateLayout( "Linear", "Vertical,VCenter" );
		this.layTab.SetMargins( 0,0,0.002,0 );
		this.layTab.SetSize( width/lst.length, 0.05 );
		this.layTab.SetBackColor( "#ffffff" );
		this.txtTab = app.CreateText( name, width/lst.length, 0.05, "FillXY,Bold,VCenter" );
          this.txtTab.SetTextSize(20);
		this.txtTab.SetTextColor( "#ffffff" );
		this.txtTab.SetBackColor( "#5a0000" );
		//this.txtTab.SetPadding( 0,0.03,0,0 );
		this.txtTab.SetOnTouch( _Tabs_OnTouch );
		this.txtTab.tabs = this; 
		this.layTab.AddChild( this.txtTab ); 
		this.layTop.AddChild( this.layTab );
		
		//Save array of tab info.
		this.tabs[name] = { txt:this.txtTab, content:null };
		
		//Add tab content layout to body.
		this.tabs[name].content = app.CreateLayout( "Linear", "fillxy"+options );
		this.layBody.AddChild( this.tabs[name].content );
		app.SetDebugEnabled( true );
    }
    
    //Set tab change callback.
    this.lay.SetOnChange = function( cb ) {  this.OnChange = cb; }

    //Return layout for given tab.
    this.lay.GetLayout = function ( name ) 
    { 
        return this.parent.tabs[name].content; 
    }
    
    //Set current tab.
    this.lay.ShowTab = function( name )
    {
		app.SetDebugEnabled( false );
		
        //Drop out if no change.
        if( curTabName==name ) { app.SetDebugEnabled(true); return; }
        curTabName = name;
        
        //Get tab info.
        var tab = this.parent.tabs[name];
        if( !tab ) { app.SetDebugEnabled(true); return; }
        
        tab.txt.SetTextColor( "#ffffff" );
        //Clear all tab selections.
        for ( var tb in this.parent.tabs ) {
            if( this.parent.tabs[tb] === tab ) continue;
              this.parent.tabs[tb].txt.SetTextColor( "#ff7777" );
		    this.parent.tabs[tb].content.SetVisibility( "Hide" );
	    }
	    //Select chosen tab.
        tab.content.SetVisibility( "Show" );
        
        app.SetDebugEnabled( true );
        
       //Fire callback if set.
       if( this.OnChange ) 
            this.OnChange( name );
    }
    
    //Add tabs.
    for( var i=0; i<lst.length; i++ ) {
		this.AddTab( lst[i] );
	}
	
	//Set default tab.
	this.lay.ShowTab( lst[0] );
	
	//Re-enable debug.
	app.SetDebugEnabled( true );

    //Return main layout to caller.
    return this.lay;
}

//Handle tab clicks.
function _Tabs_OnTouch( ev )
{
    if( ev.action=="Down" ) 
    {
		app.SetDebugEnabled( false );
        var txt = ev.source;
        txt.tabs.lay.ShowTab( txt.GetText() );
        app.SetDebugEnabled( true );
    }
}

